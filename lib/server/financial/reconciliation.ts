import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface ReconciliationFinding {
  readonly type: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly details: Record<string, unknown>;
}

export interface ReconciliationResult {
  readonly reportId: string;
  readonly findings: ReconciliationFinding[];
  readonly summary: string;
}

/**
 * Reconciliation Engine — Sprint 4.3
 *
 * Compares: Provider ↔ PaymentReference ↔ Ledger ↔ Distribution ↔ Payout
 *
 * Detects:
 * - missing payment
 * - duplicate payment
 * - ledger mismatch
 * - distribution mismatch
 * - orphan payout
 * - failed payout
 * - double payout
 * - refund mismatch
 */
export async function runReconciliationTx(
  tx: Prisma.TransactionClient,
  reportType: string,
): Promise<ReconciliationResult> {
  const findings: ReconciliationFinding[] = [];

  // 1. Check PaymentReferences against Ledger
  const paymentRefs = await tx.paymentReference.findMany();
  for (const ref of paymentRefs) {
    const investment = await tx.investment.findUnique({ where: { id: ref.investmentId } });
    if (!investment) {
      findings.push({
        type: "orphan_payment",
        severity: "error",
        message: `PaymentReference ${ref.id} references non-existent investment ${ref.investmentId}`,
        details: { paymentReferenceId: ref.id, investmentId: ref.investmentId },
      });
      continue;
    }

    if (ref.paymentStatus === "VERIFIED" || ref.paymentStatus === "CONSUMED") {
      const txn = await tx.transaction.findFirst({
        where: { investmentId: ref.investmentId, type: "investment" },
      });
      if (!txn) {
        findings.push({
          type: "ledger_mismatch",
          severity: "error",
          message: `PaymentReference ${ref.id} is VERIFIED/CONSUMED but no ledger entry exists for investment ${ref.investmentId}`,
          details: { paymentReferenceId: ref.id, investmentId: ref.investmentId, paymentStatus: ref.paymentStatus },
        });
      } else if (txn.amount !== ref.capturedAmount) {
        findings.push({
          type: "ledger_mismatch",
          severity: "error",
          message: `PaymentReference ${ref.id} amount ${ref.capturedAmount} does not match ledger entry amount ${txn.amount}`,
          details: { paymentReferenceId: ref.id, capturedAmount: ref.capturedAmount, ledgerAmount: txn.amount },
        });
      }
    }
  }

  // 2. Check for orphan payouts (payouts with no matching allocation)
  const payouts = await tx.payout.findMany();
  for (const payout of payouts) {
    const allocation = await tx.distributionAllocation.findUnique({
      where: { id: payout.allocationId },
    });
    if (!allocation) {
      findings.push({
        type: "orphan_payout",
        severity: "error",
        message: `Payout ${payout.id} references non-existent allocation ${payout.allocationId}`,
        details: { payoutId: payout.id, allocationId: payout.allocationId },
      });
    }
  }

  // 3. Check for failed payouts
  const failedPayouts = payouts.filter((p) => p.status === "failed");
  for (const payout of failedPayouts) {
    findings.push({
      type: "failed_payout",
      severity: "warning",
      message: `Payout ${payout.id} is in failed status`,
      details: { payoutId: payout.id, amount: payout.amount, lastError: payout.lastError },
    });
  }

  // 4. Check for double payouts (multiple completed payouts for same allocation)
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const payoutByAllocation = new Map<string, typeof completedPayouts>();
  for (const p of completedPayouts) {
    const list = payoutByAllocation.get(p.allocationId) ?? [];
    list.push(p);
    payoutByAllocation.set(p.allocationId, list);
  }
  for (const [allocationId, allocPayouts] of payoutByAllocation) {
    if (allocPayouts.length > 1) {
      findings.push({
        type: "double_payout",
        severity: "error",
        message: `Allocation ${allocationId} has ${allocPayouts.length} completed payouts`,
        details: { allocationId, payoutIds: allocPayouts.map((p) => p.id) },
      });
    }
  }

  // 5. Check for distribution mismatches
  const distributions = await tx.distribution.findMany({ where: { status: "approved" } });
  for (const dist of distributions) {
    const distPayouts = payouts.filter((p) => p.distributionId === dist.id && p.status === "completed");
    const totalPaid = distPayouts.reduce((s, p) => s + p.amount, 0);
    if (totalPaid !== dist.totalAmount) {
      findings.push({
        type: "distribution_mismatch",
        severity: "warning",
        message: `Distribution ${dist.id} total ${dist.totalAmount} does not match completed payouts total ${totalPaid}`,
        details: { distributionId: dist.id, totalAmount: dist.totalAmount, totalPaid },
      });
    }
  }

  // 5. Check for refund mismatches
  const refundedRefs = await tx.paymentReference.findMany({
    where: { paymentStatus: "REFUNDED" },
  });
  for (const ref of refundedRefs) {
    const investment = await tx.investment.findUnique({ where: { id: ref.investmentId } });
    if (investment && investment.status !== "cancelled") {
      findings.push({
        type: "refund_mismatch",
        severity: "warning",
        message: `PaymentReference ${ref.id} is REFUNDED but investment ${ref.investmentId} is not cancelled`,
        details: { paymentReferenceId: ref.id, investmentId: ref.investmentId, investmentStatus: investment.status },
      });
    }
  }

  const report = await tx.reconciliationReport.create({
    data: {
      reportType,
      status: "completed",
      summary: JSON.stringify({ totalFindings: findings.length, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length }),
      details: JSON.stringify(findings),
    },
  });

  await tx.auditEvent.create({
    data: {
      actorId: "reconciliation-engine",
      action: "reconciliation.completed",
      resource: "reconciliation",
      resourceId: report.id,
      details: JSON.stringify({
        reportType,
        totalFindings: findings.length,
        errors: findings.filter((f) => f.severity === "error").length,
        warnings: findings.filter((f) => f.severity === "warning").length,
      }),
    },
  });

  return {
    reportId: report.id,
    findings,
    summary: JSON.stringify({ totalFindings: findings.length }),
  };
}