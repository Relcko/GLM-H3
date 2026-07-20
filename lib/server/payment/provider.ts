export type PaymentProviderStatus = "PENDING" | "AUTHORIZED" | "VERIFIED" | "FAILED" | "REFUNDED" | "VOIDED";

export interface ParsedPayload {
  readonly providerEventId: string;
  readonly providerPaymentId: string;
  readonly investmentId: string;
  readonly capturedAmount: number;
  readonly capturedCurrency: string;
  readonly capturedAt: Date;
  readonly status: PaymentProviderStatus;
  readonly rawResponse: string;
}

export interface PaymentProvider {
  readonly name: string;

  verifyWebhook(body: string, headers: Record<string, string>): Promise<boolean>;

  parsePayload(body: string): Promise<ParsedPayload>;

  providerReference(payload: ParsedPayload): string;

  capturedAmount(payload: ParsedPayload): number;

  capturedCurrency(payload: ParsedPayload): string;

  status(payload: ParsedPayload): PaymentProviderStatus;
}
