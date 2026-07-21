export interface PaymentResult {
  readonly success: boolean;
  readonly txHash: string | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
}

export interface PaymentRequest {
  readonly recipientId: string;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly sourceAccountId: string;
}

export interface IPaymentGateway {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  getStatus(txHash: string): Promise<PaymentResult>;
}
