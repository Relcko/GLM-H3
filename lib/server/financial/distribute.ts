import type { Prisma } from "@prisma/client";
import type { HandlerResult } from "../idempotency";
import { FinancialError } from "./errors";

const DISTRIBUTABLE_STATUSES = ["pending", "approved"] as const;

export interface DistributeInput {
  readonly distributionId: string;
  readonly actorId: string;
}

export interface DistributionExecutedBody {
  readonly distributionId: string;
  readonly status: string;
  readonly propertyId: string;
  readonly eligibleTokens: number;
  readonly perTokenAmount: number;
  readonly totalDistributed: number;
  readonly allocationCount: number;
  readonly alreadyDistributed: boolean;
}

export async function distributeDistributionTx(
  tx: Prisma.TransactionClient,
  input: DistributeInput,
): Promise<HandlerResult<DistributionExecutedBody>> {
  const distribution = await tx.distribution.findUnique({
    where: { id: input.distributionId },
    include: { allocations: true },
  });
  if (!distribution) {
    throw new FinancialError(404, "DISTRIBUTION_NOT_FOUND", `Distribution ${input.distributionId} not found`);
  }

  if (distribution.status === "distributed") {
    return {
      statusCode: 200,
      body: {
        distributionId: distribution.id,
        status: distribution.status,
        propertyId: distribution.propertyId,
        eligibleTokens: distribution.eligibleTokens,
        perTokenAmount: distribution.perTokenAmount,
        totalDistributed: distribution.totalDistributed,
        allocationCount: distribution.allocations.length,
        alreadyDistributed: true,
      },
    };
  }

  if (!(DISTRIBUTABLE_STATUSES as readonly string[]).includes(distribution.status)) {
    throw new FinancialError(
      409,
      "INVALID_DISTRIBUTION_STATE",
      `Cannot distribute distribution ${distribution.id} from status ${distribution.status}`,
    );
  }

  const claimed = await tx.distribution.updateMany({
    where: { id: distribution.id, status: { in: [...DISTRIBUTABLE_STATUSES] } },
    data: { status: "distributed", distributedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new FinancialError(
      409,
      "CONCURRENT_DISTRIBUTION",
      `Distribution ${distribution.id} is being distributed concurrently`,
    );
  }

  const confirmed = await tx.investment.findMany({
    where: { propertyId: distribution.propertyId, status: { in: ["confirmed", "ledger_posted"] } },
    orderBy: { createdAt: "asc" },
  });
  const tokensByAccount = new Map<string, { tokens: number; investmentId: string }>();
  for (const inv of confirmed) {
    const entry = tokensByAccount.get(inv.accountId);
    if (entry) {
      entry.tokens += inv.tokens;
    } else {
      tokensByAccount.set(inv.accountId, { tokens: inv.tokens, investmentId: inv.id });
    }
  }

  const eligibleTokens = [...tokensByAccount.values()].reduce((sum, e) => sum + e.tokens, 0);
  const perTokenAmount =
    distribution.perTokenAmount > 0
      ? distribution.perTokenAmount
      : eligibleTokens > 0
        ? Math.floor(distribution.totalAmount / eligibleTokens)
        : 0;

  const now = new Date();
  let totalDistributed = 0;
  for (const [accountId, entry] of tokensByAccount) {
    const amount = entry.tokens * perTokenAmount;
    await tx.dividendAllocation.create({
      data: {
        distributionId: distribution.id,
        accountId,
        investmentId: entry.investmentId,
        tokens: entry.tokens,
        amount,
        status: "paid",
        paidAt: now,
      },
    });
    totalDistributed += amount;
  }

  await tx.distribution.update({
    where: { id: distribution.id },
    data: { totalDistributed, eligibleTokens, perTokenAmount },
  });

  await tx.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: "treasury.distribution.distributed",
      resource: "distribution",
      resourceId: distribution.id,
      details: JSON.stringify({ totalDistributed, eligibleTokens, allocationCount: tokensByAccount.size }),
    },
  });

  return {
    statusCode: 200,
    body: {
      distributionId: distribution.id,
      status: "distributed",
      propertyId: distribution.propertyId,
      eligibleTokens,
      perTokenAmount,
      totalDistributed,
      allocationCount: tokensByAccount.size,
      alreadyDistributed: false,
    },
  };
}
