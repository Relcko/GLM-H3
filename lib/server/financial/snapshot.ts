import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface SnapshotInput {
  readonly distributionId: string;
}

export interface SnapshotResult {
  readonly snapshotId: string;
  readonly distributionId: string;
  readonly propertyId: string;
  readonly totalEligibleTokens: number;
  readonly allocationCount: number;
}

/**
 * Snapshot Engine — Sprint 4.2
 *
 * Freezes token ownership at distribution time by scanning all ledger_posted
 * investments for the property and creating an immutable snapshot.
 *
 * Future transfers and investments do NOT affect this snapshot.
 */
export async function createDistributionSnapshotTx(
  tx: Prisma.TransactionClient,
  input: SnapshotInput,
): Promise<SnapshotResult> {
  const distribution = await tx.distribution.findUnique({
    where: { id: input.distributionId },
  });
  if (!distribution) {
    throw new FinancialError(404, "DISTRIBUTION_NOT_FOUND", `Distribution ${input.distributionId} not found`);
  }

  if (distribution.snapshotId) {
    const existing = await tx.distributionSnapshot.findUnique({
      where: { id: distribution.snapshotId },
    });
    if (!existing) {
      throw new FinancialError(500, "SNAPSHOT_INCONSISTENT", `Distribution ${input.distributionId} has snapshotId but snapshot not found`);
    }
    return {
      snapshotId: existing.id,
      distributionId: distribution.id,
      propertyId: distribution.propertyId,
      totalEligibleTokens: existing.totalEligibleTokens,
      allocationCount: await tx.distributionAllocation.count({ where: { snapshotId: existing.id } }),
    };
  }

  if (distribution.status !== "pending") {
    throw new FinancialError(409, "INVALID_DISTRIBUTION_STATE", `Cannot snapshot distribution ${distribution.id} from status ${distribution.status}`);
  }

  const eligibleInvestments = await tx.investment.findMany({
    where: {
      propertyId: distribution.propertyId,
      status: "ledger_posted",
    },
    orderBy: { createdAt: "asc" },
  });

  const totalEligibleTokens = eligibleInvestments.reduce((sum, inv) => sum + inv.tokens, 0);
  if (totalEligibleTokens <= 0) {
    throw new FinancialError(422, "NO_ELIGIBLE_TOKENS", `No eligible tokens found for property ${distribution.propertyId}`);
  }

  const snapshot = await tx.distributionSnapshot.create({
    data: {
      distributionId: distribution.id,
      propertyId: distribution.propertyId,
      totalEligibleTokens,
    },
  });

  await tx.distribution.update({
    where: { id: distribution.id },
    data: { snapshotId: snapshot.id, eligibleTokens: totalEligibleTokens, status: "approved" },
  });

  const investorMap = new Map<string, { tokens: number; investmentId: string }>();
  for (const inv of eligibleInvestments) {
    const entry = investorMap.get(inv.accountId);
    if (entry) {
      entry.tokens += inv.tokens;
    } else {
      investorMap.set(inv.accountId, { tokens: inv.tokens, investmentId: inv.id });
    }
  }

  let allocationCount = 0;
  for (const [accountId, entry] of investorMap) {
    const percentageBps = Math.floor((entry.tokens * 10000) / totalEligibleTokens);
    const grossAmount = Math.floor((entry.tokens * distribution.totalAmount) / totalEligibleTokens);

    await tx.distributionAllocation.create({
      data: {
        snapshotId: snapshot.id,
        investorId: accountId,
        investmentId: entry.investmentId,
        eligibleTokens: entry.tokens,
        percentageBps,
        grossAmount,
      },
    });
    allocationCount++;
  }

  const allocatedSum = investorMap.size > 0
    ? (await tx.distributionAllocation.aggregate({
      where: { snapshotId: snapshot.id },
      _sum: { grossAmount: true },
    }))._sum.grossAmount ?? 0
    : 0;

  const residual = distribution.totalAmount - allocatedSum;
  if (residual > 0 && investorMap.size > 0) {
    const sortedAllocations = await tx.distributionAllocation.findMany({
      where: { snapshotId: snapshot.id },
      orderBy: [{ eligibleTokens: "desc" }, { investorId: "asc" }],
    });

    let remaining = residual;
    for (const alloc of sortedAllocations) {
      if (remaining <= 0) break;
      await tx.distributionAllocation.update({
        where: { id: alloc.id },
        data: { grossAmount: alloc.grossAmount + 1 },
      });
      remaining--;
    }
  }

  await tx.auditEvent.create({
    data: {
      actorId: "treasury-engine",
      action: "distribution.snapshot.created",
      resource: "distribution",
      resourceId: distribution.id,
      details: JSON.stringify({
        snapshotId: snapshot.id,
        propertyId: distribution.propertyId,
        totalEligibleTokens,
        allocationCount,
        totalAmount: distribution.totalAmount,
        residual,
      }),
    },
  });

  return {
    snapshotId: snapshot.id,
    distributionId: distribution.id,
    propertyId: distribution.propertyId,
    totalEligibleTokens,
    allocationCount,
  };
}
