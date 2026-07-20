import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface RefundInput {
  readonly paymentReferenceId: string;
  readonly actorId: string;
}

export interface RefundResult {
  readonly paymentReferenceId: string;
  readonly investmentId: string;
  readonly paymentStatus: string;
  readonly alreadyRefunded: boolean;
}

/**
 * Refund Engine — Sprint 4.3
 *
 * Orchestrates the refund lifecycle:
 *   VERIFIED → REFUND_REQUESTED → REFUNDED
 *
 * Idempotent, replay safe, provider abstraction.
 * Settlement remains unchanged.
 */
export async function requestRefundTx(
  tx: Prisma.TransactionClient,
  input: RefundInput,
): Promise<RefundResult> {
  const ref = await tx.paymentReference.findUnique({
    where: { id: input.paymentReferenceId },
  });
  if (!ref) {
    throw new FinancialError(404, "PAYMENT_REFERENCE_NOT_FOUND", `Payment reference ${input.paymentReferenceId} not found`);
  }

  if (ref.paymentStatus === "REFUNDED") {
    return {
      paymentReferenceId: ref.id,
      investmentId: ref.investmentId,
      paymentStatus: "REFUNDED",
      alreadyRefunded: true,
    };
  }

  if (ref.paymentStatus === "REFUND_REQUESTED") {
    return {
      paymentReferenceId: ref.id,
      investmentId: ref.investmentId,
      paymentStatus: "REFUND_REQUESTED",
      alreadyRefunded: false,
    };
  }

  if (ref.paymentStatus !== "VERIFIED") {
    throw new FinancialError(
      409,
      "INVALID_REFUND_STATE",
      `Cannot refund payment ${ref.id} from status "${ref.paymentStatus}" — only VERIFIED payments can be refunded`,
    );
  }

  const casResult = await tx.paymentReference.updateMany({
    where: { id: ref.id, paymentStatus: "VERIFIED" },
    data: { paymentStatus: "REFUND_REQUESTED" },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_REFUND", `Payment reference ${ref.id} was modified concurrently`);
  }

  await tx.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: "refund.requested",
      resource: "payment",
      resourceId: ref.id,
      details: JSON.stringify({
        investmentId: ref.investmentId,
        amount: ref.capturedAmount,
        currency: ref.capturedCurrency,
      }),
    },
  });

  return {
    paymentReferenceId: ref.id,
    investmentId: ref.investmentId,
    paymentStatus: "REFUND_REQUESTED",
    alreadyRefunded: false,
  };
}

export async function completeRefundTx(
  tx: Prisma.TransactionClient,
  input: RefundInput,
): Promise<RefundResult> {
  const ref = await tx.paymentReference.findUnique({
    where: { id: input.paymentReferenceId },
  });
  if (!ref) {
    throw new FinancialError(404, "PAYMENT_REFERENCE_NOT_FOUND", `Payment reference ${input.paymentReferenceId} not found`);
  }

  if (ref.paymentStatus === "REFUNDED") {
    return {
      paymentReferenceId: ref.id,
      investmentId: ref.investmentId,
      paymentStatus: "REFUNDED",
      alreadyRefunded: true,
    };
  }

  if (ref.paymentStatus !== "REFUND_REQUESTED") {
    throw new FinancialError(
      409,
      "INVALID_REFUND_STATE",
      `Cannot complete refund for payment ${ref.id} from status "${ref.paymentStatus}" — expected "REFUND_REQUESTED"`,
    );
  }

  const casResult = await tx.paymentReference.updateMany({
    where: { id: ref.id, paymentStatus: "REFUND_REQUESTED" },
    data: { paymentStatus: "REFUNDED" },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_REFUND", `Payment reference ${ref.id} was modified concurrently`);
  }

  await tx.auditEvent.create({
    data: {
      actorId: input.actorId,
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

  return {
    paymentReferenceId: ref.id,
    investmentId: ref.investmentId,
    paymentStatus: "REFUNDED",
    alreadyRefunded: false,
  };
}