export class PaymentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class WebhookSignatureError extends PaymentError {
  constructor(message = "Webhook signature verification failed") {
    super(401, "WEBHOOK_SIGNATURE_INVALID", message);
  }
}

export class WebhookTimestampError extends PaymentError {
  constructor(message = "Webhook timestamp is outside tolerance window") {
    super(401, "WEBHOOK_TIMESTAMP_INVALID", message);
  }
}

export class DuplicateProviderEventError extends PaymentError {
  constructor(providerEventId: string) {
    super(409, "DUPLICATE_PROVIDER_EVENT", `Provider event ${providerEventId} has already been processed`);
  }
}

export class ProviderConfigurationError extends PaymentError {
  constructor(provider: string, message: string) {
    super(500, "PROVIDER_CONFIGURATION_ERROR", `Provider ${provider}: ${message}`);
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(investmentId: string) {
    super(404, "PAYMENT_NOT_FOUND", `No payment reference found for investment ${investmentId}`);
  }
}
