import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface ClaimInput {
  readonly distributionId: string;
  readonly investorId: string;
}

export interface ClaimResult {
  readonly allocationId: string;
  readonly distributionId: string;
  readonly investorId: string;
  readonly grossAmount: number;
  readonly claimStatus: string;
  readonly alreadyClaimed: boolean;
  readonly transactionId?: string;
}

/**
 * Claim Engine — Sprint 4.2
 *
 * CAS-protected, idempotent, replay-safe distribution claims.
 *
 * Algorithm:
 * 1. Look up distribution → snapshot → allocation for this investor
 * 2. CAS transition: claimStatus "pending" → "claimed" (updateMany)
 * 3. Create a Transaction record (type "distribution") for the ledger
 * 4. Idempotent: if already claimed, return the stored result
 * 5. Replay-safe: repeated requests return the same transaction
 */
export async function claimDistributionTx(
  tx: Prisma.TransactionClient,
  input: ClaimInput,
): Promise<ClaimResult> {
  const distribution = await tx.distribution.findUnique({
    where: { id: input.distributionId },
  });
  if (!distribution) {
    throw new FinancialError(404, "DISTRIBUTION_NOT_FOUND", `Distribution ${input.distributionId} not found`);
  }

  if (!distribution.snapshotId) {
    throw new FinancialError(409, "DISTRIBUTION_NOT_SNAPSHOTTED", `Distribution ${input.distributionId} has no snapshot — create one first`);
  }

  const allocation = await tx.distributionAllocation.findFirst({
    where: {
      snapshotId: distribution.snapshotId,
      investorId: input.investorId,
    },
  });
  if (!allocation) {
    throw new FinancialError(404, "ALLOCATION_NOT_FOUND", `No allocation found for investor ${input.investorId} in distribution ${input.distributionId}`);
  }

  if (allocation.claimStatus === "claimed") {
    const existingTxn = await tx.transaction.findFirst({
      where: {
        investmentId: allocation.investmentId,
        type: "distribution",
        accountId: input.investorId,
        reference: allocation.id,
      },
    });

    return {
      allocationId: allocation.id,
      distributionId: input.distributionId,
      investorId: input.investorId,
      grossAmount: allocation.grossAmount,
      claimStatus: "claimed",
      alreadyClaimed: true,
      transactionId: existingTxn?.id,
    };
  }

  const casResult = await tx.distributionAllocation.updateMany({
    where: {
      id: allocation.id,
      claimStatus: "pending",
    },
    data: {
      claimStatus: "claimed",
      claimedAt: new Date(),
    },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(
      409,
      "CONCURRENT_CLAIM",
      `Allocation ${allocation.id} was claimed concurrently`,
    );
  }

  const txn = await tx.transaction.create({
    data: {
      investmentId: allocation.investmentId,
      accountId: input.investorId,
      type: "distribution",
      amount: allocation.grossAmount,
      status: "completed",
      reference: allocation.id,
      description: `Distribution claim for investment ${allocation.investmentId} — ${allocation.grossAmount} ${distribution.period}`,
    },
  });

  await tx.auditEvent.create({
    data: {
      actorId: input.investorId,
      action: "distribution.claimed",
      resource: "distribution",
      resourceId: input.distributionId,
      details: JSON.stringify({
        allocationId: allocation.id,
        distributionId: input.distributionId,
        amount: allocation.grossAmount,
        period: distribution.period,
      }),
    },
  });

  return {
    allocationId: allocation.id,
    distributionId: input.distributionId,
    investorId: input.investorId,
    grossAmount: allocation.grossAmount,
    claimStatus: "claimed",
    alreadyClaimed: false,
    transactionId: txn.id,
  };
}
