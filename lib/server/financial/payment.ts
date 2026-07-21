import { Prisma } from "@prisma/client";
import { FinancialError } from "./errors";

export const PAYMENT_STATUS_VERIFIED = "VERIFIED";
export const PAYMENT_STATUS_CONSUMED = "CONSUMED";

export interface PaymentValidationInput {
  readonly investmentId: string;
  readonly expectedAmount: number;
}

export interface PaymentValidationResult {
  readonly paymentReferenceId: string;
  readonly providerPaymentId: string;
  readonly capturedAmount: number;
  readonly capturedCurrency: string;
  readonly capturedAt: Date;
  readonly paymentProvider: string;
}

export async function validateAndConsumePaymentReference(
  tx: Prisma.TransactionClient,
  input: PaymentValidationInput,
): Promise<PaymentValidationResult> {
  const ref = await tx.paymentReference.findUnique({ where: { investmentId: input.investmentId } });
  if (!ref) {
    throw new FinancialError(422, "PAYMENT_REFERENCE_MISSING", `No payment reference found for investment ${input.investmentId}`);
  }

  if (!ref.providerPaymentId) {
    throw new FinancialError(422, "PAYMENT_PROVIDER_REFERENCE_MISSING", `Payment reference ${ref.id} has no provider payment ID`);
  }

  if (ref.paymentStatus === "CONSUMED") {
    throw new FinancialError(
      409,
      "PAYMENT_ALREADY_CONSUMED",
      `Payment reference ${ref.id} has already been consumed`,
    );
  }

  if (ref.paymentStatus !== "VERIFIED") {
    throw new FinancialError(
      422,
      "PAYMENT_NOT_VERIFIED",
      `Payment reference ${ref.id} has status "${ref.paymentStatus}", expected "VERIFIED"`,
    );
  }

  if (ref.capturedAmount !== input.expectedAmount) {
    throw new FinancialError(
      422,
      "PAYMENT_AMOUNT_MISMATCH",
      `Payment reference ${ref.id} captured amount ${ref.capturedAmount} does not match investment amount ${input.expectedAmount}`,
    );
  }

  await tx.paymentReference.update({
    where: { id: ref.id },
    data: { paymentStatus: "CONSUMED", consumedAt: new Date() },
  });

  return {
    paymentReferenceId: ref.id,
    providerPaymentId: ref.providerPaymentId!,
    capturedAmount: ref.capturedAmount,
    capturedCurrency: ref.capturedCurrency,
    capturedAt: ref.capturedAt!,
    paymentProvider: ref.paymentProvider,
  };
}
