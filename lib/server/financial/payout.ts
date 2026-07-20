import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface PayoutInput {
  readonly allocationId: string;
  readonly distributionId: string;
  readonly investorId: string;
  readonly amount: number;
}

export interface PayoutResult {
  readonly payoutId: string;
  readonly allocationId: string;
  readonly amount: number;
  readonly status: string;
  readonly alreadyProcessed: boolean;
}

export interface PayoutRetryInput {
  readonly payoutId: string;
}

/**
 * Payout Engine — Sprint 4.3
 *
 * Investor Claim → Create payout request → PROCESSING → COMPLETED | FAILED
 *
 * Idempotent, retry safe, duplicate protection, immutable payout history.
 */
export async function createPayoutTx(
  tx: Prisma.TransactionClient,
  input: PayoutInput,
): Promise<PayoutResult> {
  const existing = await tx.payout.findUnique({
    where: { allocationId: input.allocationId },
  });
  if (existing) {
    if (existing.status === "completed") {
      return {
        payoutId: existing.id,
        allocationId: existing.allocationId,
        amount: existing.amount,
        status: "completed",
        alreadyProcessed: true,
      };
    }
    return {
      payoutId: existing.id,
      allocationId: existing.allocationId,
      amount: existing.amount,
      status: existing.status,
      alreadyProcessed: true,
    };
  }

  const payout = await tx.payout.create({
    data: {
      distributionId: input.distributionId,
      allocationId: input.allocationId,
      investorId: input.investorId,
      amount: input.amount,
      status: "pending",
    },
  });

  await tx.auditEvent.create({
    data: {
      actorId: input.investorId,
      action: "payout.started",
      resource: "payout",
      resourceId: payout.id,
      details: JSON.stringify({
        distributionId: input.distributionId,
        allocationId: input.allocationId,
        amount: input.amount,
      }),
    },
  });

  return {
    payoutId: payout.id,
    allocationId: payout.allocationId,
    amount: payout.amount,
    status: "pending",
    alreadyProcessed: false,
  };
}

export async function completePayoutTx(
  tx: Prisma.TransactionClient,
  payoutId: string,
  actorId: string,
): Promise<PayoutResult> {
  const payout = await tx.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new FinancialError(404, "PAYOUT_NOT_FOUND", `Payout ${payoutId} not found`);
  }

  if (payout.status === "completed") {
    return {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      amount: payout.amount,
      status: "completed",
      alreadyProcessed: true,
    };
  }

  if (payout.status !== "processing") {
    throw new FinancialError(
      409,
      "INVALID_PAYOUT_STATE",
      `Cannot complete payout ${payout.id} from status "${payout.status}" — expected "processing"`,
    );
  }

  const casResult = await tx.payout.updateMany({
    where: { id: payout.id, status: "processing" },
    data: { status: "completed", processedAt: new Date() },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_PAYOUT", `Payout ${payout.id} was modified concurrently`);
  }

  await tx.payoutLedger.create({
    data: {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      investorId: payout.investorId,
      amount: payout.amount,
    },
  });

  await tx.auditEvent.create({
    data: {
      actorId: "payout-engine",
      action: "payout.completed",
      resource: "payout",
      resourceId: payout.id,
      details: JSON.stringify({
        allocationId: payout.allocationId,
        amount: payout.amount,
      }),
    },
  });

  return {
    payoutId: payout.id,
    allocationId: payout.allocationId,
    amount: payout.amount,
    status: "completed",
    alreadyProcessed: false,
  };
}

export async function failPayoutTx(
  tx: Prisma.TransactionClient,
  payoutId: string,
  errorMessage: string,
): Promise<PayoutResult> {
  const payout = await tx.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new FinancialError(404, "PAYOUT_NOT_FOUND", `Payout ${payoutId} not found`);
  }

  if (payout.status === "failed") {
    return {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      amount: payout.amount,
      status: "failed",
      alreadyProcessed: true,
    };
  }

  if (payout.status !== "processing") {
    throw new FinancialError(
      409,
      "INVALID_PAYOUT_STATE",
      `Cannot fail payout ${payout.id} from status "${payout.status}" — expected "processing"`,
    );
  }

  const casResult = await tx.payout.updateMany({
    where: { id: payout.id, status: "processing" },
    data: {
      status: "failed",
      lastError: errorMessage,
      retryCount: { increment: 1 },
    },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_PAYOUT", `Payout ${payout.id} was modified concurrently`);
  }

  await tx.auditEvent.create({
    data: {
      actorId: "payout-engine",
      action: "payout.failed",
      resource: "payout",
      resourceId: payout.id,
      details: JSON.stringify({
        allocationId: payout.allocationId,
        amount: payout.amount,
        error: errorMessage,
      }),
    },
  });

  return {
    payoutId: payout.id,
    allocationId: payout.allocationId,
    amount: payout.amount,
    status: "failed",
    alreadyProcessed: false,
  };
}

export async function processPayoutTx(
  tx: Prisma.TransactionClient,
  payoutId: string,
): Promise<PayoutResult> {
  const payout = await tx.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new FinancialError(404, "PAYOUT_NOT_FOUND", `Payout ${payoutId} not found`);
  }

  if (payout.status === "completed") {
    return {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      amount: payout.amount,
      status: "completed",
      alreadyProcessed: true,
    };
  }

  if (payout.status === "processing") {
    return {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      amount: payout.amount,
      status: "processing",
      alreadyProcessed: true,
    };
  }

  if (payout.status !== "pending") {
    throw new FinancialError(
      409,
      "INVALID_PAYOUT_STATE",
      `Cannot process payout ${payout.id} from status "${payout.status}" — expected "pending"`,
    );
  }

  const casResult = await tx.payout.updateMany({
    where: { id: payout.id, status: "pending" },
    data: { status: "processing" },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_PAYOUT", `Payout ${payout.id} was modified concurrently`);
  }

  await tx.auditEvent.create({
    data: {
      actorId: "payout-engine",
      action: "payout.processing",
      resource: "payout",
      resourceId: payout.id,
      details: JSON.stringify({
        allocationId: payout.allocationId,
        amount: payout.amount,
      }),
    },
  });

  return {
    payoutId: payout.id,
    allocationId: payout.allocationId,
    amount: payout.amount,
    status: "processing",
    alreadyProcessed: false,
  };
}

export async function retryPayoutTx(
  tx: Prisma.TransactionClient,
  payoutId: string,
): Promise<PayoutResult> {
  const payout = await tx.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new FinancialError(404, "PAYOUT_NOT_FOUND", `Payout ${payoutId} not found`);
  }

  if (payout.status === "completed") {
    return {
      payoutId: payout.id,
      allocationId: payout.allocationId,
      amount: payout.amount,
      status: "completed",
      alreadyProcessed: true,
    };
  }

  if (payout.status !== "failed") {
    throw new FinancialError(
      409,
      "INVALID_RETRY_STATE",
      `Cannot retry payout ${payout.id} from status "${payout.status}" — only failed payouts can be retried`,
    );
  }

  const casResult = await tx.payout.updateMany({
    where: { id: payout.id, status: "failed" },
    data: { status: "pending", lastError: null },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_RETRY", `Payout ${payout.id} was modified concurrently`);
  }

  return {
    payoutId: payout.id,
    allocationId: payout.allocationId,
    amount: payout.amount,
    status: "pending",
    alreadyProcessed: false,
  };
}