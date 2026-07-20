import type { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export interface VoidInput {
  readonly paymentReferenceId: string;
  readonly actorId: string;
}

export interface VoidResult {
  readonly paymentReferenceId: string;
  readonly investmentId: string;
  readonly paymentStatus: string;
  readonly alreadyVoided: boolean;
}

/**
 * Void Engine — Sprint 4.3
 *
 * Supports AUTHORIZED → VOIDED transition.
 * Cannot void settled (VERIFIED/CONSUMED) payments.
 * Must create audit events.
 */
export async function voidPaymentTx(
  tx: Prisma.TransactionClient,
  input: VoidInput,
): Promise<VoidResult> {
  const ref = await tx.paymentReference.findUnique({
    where: { id: input.paymentReferenceId },
  });
  if (!ref) {
    throw new FinancialError(404, "PAYMENT_REFERENCE_NOT_FOUND", `Payment reference ${input.paymentReferenceId} not found`);
  }

  if (ref.paymentStatus === "VOIDED") {
    return {
      paymentReferenceId: ref.id,
      investmentId: ref.investmentId,
      paymentStatus: "VOIDED",
      alreadyVoided: true,
    };
  }

  if (ref.paymentStatus !== "AUTHORIZED") {
    throw new FinancialError(
      409,
      "INVALID_VOID_STATE",
      `Cannot void payment ${ref.id} from status "${ref.paymentStatus}" — only AUTHORIZED payments can be voided`,
    );
  }

  const casResult = await tx.paymentReference.updateMany({
    where: { id: ref.id, paymentStatus: "AUTHORIZED" },
    data: { paymentStatus: "VOIDED" },
  });
  if (casResult.count !== 1) {
    throw new FinancialError(409, "CONCURRENT_VOID", `Payment reference ${ref.id} was modified concurrently`);
  }

  await tx.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: "payment.voided",
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
    paymentStatus: "VOIDED",
    alreadyVoided: false,
  };
}