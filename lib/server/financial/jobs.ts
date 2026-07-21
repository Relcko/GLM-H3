import type { Prisma, PrismaClient } from "@prisma/client";
import { FinancialError } from "./errors";
import { runReconciliationTx } from "./reconciliation";
import { retryPayoutTx, processPayoutTx, completePayoutTx, failPayoutTx } from "./payout";
import { completeRefundTx } from "./refund";

export interface JobResult {
  readonly jobId: string;
  readonly jobType: string;
  readonly status: string;
  readonly summary: string;
}

/**
 * Scheduled Jobs — Sprint 4.3
 *
 * Background jobs for operational correctness:
 * - daily reconciliation
 * - failed payout retry
 * - refund retry
 * - stale payout detection
 *
 * All jobs are idempotent.
 */

export async function runDailyReconciliationJob(
  tx: Prisma.TransactionClient,
): Promise<JobResult> {
  const result = await runReconciliationTx(tx, "daily");
  return {
    jobId: result.reportId,
    jobType: "daily_reconciliation",
    status: "completed",
    summary: result.summary,
  };
}

export async function retryFailedPayoutsJob(
  tx: Prisma.TransactionClient,
): Promise<JobResult> {
  const failedPayouts = await tx.payout.findMany({
    where: { status: "failed", retryCount: { lt: 3 } },
  });

  let retried = 0;
  for (const payout of failedPayouts) {
    const casResult = await tx.payout.updateMany({
      where: { id: payout.id, status: "failed" },
      data: { status: "pending", lastError: null },
    });
    if (casResult.count === 1) {
      retried++;
    }
  }

  return {
    jobId: crypto.randomUUID(),
    jobType: "payout_retry",
    status: "completed",
    summary: JSON.stringify({ totalFailed: failedPayouts.length, retried }),
  };
}

export async function retryRefundsJob(
  tx: Prisma.TransactionClient,
): Promise<JobResult> {
  const refundRequested = await tx.paymentReference.findMany({
    where: { paymentStatus: "REFUND_REQUESTED" },
  });

  let retried = 0;
  for (const ref of refundRequested) {
    const casResult = await tx.paymentReference.updateMany({
      where: { id: ref.id, paymentStatus: "REFUND_REQUESTED" },
      data: { paymentStatus: "REFUNDED" },
    });
    if (casResult.count === 1) {
      await tx.auditEvent.create({
        data: {
          actorId: "refund-engine",
          action: "refund.completed",
          resource: "payment",
          resourceId: ref.id,
          details: JSON.stringify({
            investmentId: ref.investmentId,
            amount: ref.capturedAmount,
            currency: ref.capturedCurrency,
          }),
        },
      });
      retried++;
    }
  }

  return {
    jobId: crypto.randomUUID(),
    jobType: "refund_retry",
    status: "completed",
    summary: JSON.stringify({ totalStuck: refundRequested.length, completed: retried }),
  };
}

export async function detectStalePayoutsJob(
  tx: Prisma.TransactionClient,
): Promise<JobResult> {
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stalePayouts = await tx.payout.findMany({
    where: {
      status: "processing",
      updatedAt: { lt: staleThreshold },
    },
  });

  let marked = 0;
  for (const payout of stalePayouts) {
    const casResult = await tx.payout.updateMany({
      where: { id: payout.id, status: "processing" },
      data: { status: "failed", lastError: "Stale payout detected — no completion within 24 hours", retryCount: { increment: 1 } },
    });
    if (casResult.count === 1) {
      marked++;
    }
  }

  return {
    jobId: crypto.randomUUID(),
    jobType: "stale_payout_detection",
    status: "completed",
    summary: JSON.stringify({ totalStale: stalePayouts.length, marked }),
  };
}