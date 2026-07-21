import type { PaymentResult } from "../infrastructure/adapters/payment-gateway.interface";

export enum PaymentOutcome {
  Success = "success",
  RetryableFailure = "retryable_failure",
  NonRetryableFailure = "non_retryable_failure",
  Timeout = "timeout",
  Unknown = "unknown",
}

export interface ClassifiedResult {
  readonly outcome: PaymentOutcome;
  readonly txHash: string | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
}

const RETRYABLE_ERROR_CODES = new Set([
  "GATEWAY_TIMEOUT",
  "NETWORK_ERROR",
  "RATE_LIMITED",
  "INSUFFICIENT_FUNDS_TEMPORARY",
  "PROVIDER_UNAVAILABLE",
  "PROCESSOR_ERROR",
]);

const NON_RETRYABLE_ERROR_CODES = new Set([
  "INVALID_ACCOUNT",
  "ACCOUNT_CLOSED",
  "ACCOUNT_FROZEN",
  "CURRENCY_MISMATCH",
  "AMOUNT_EXCEEDS_LIMIT",
  "INVALID_CURRENCY",
  "BLOCKED_BY_REGULATION",
  "FRAUD_SUSPECTED",
  "UNSUPPORTED_RECIPIENT",
  "INVALID_SETTLEMENT_REF",
  "DUPLICATE_SETTLEMENT_REF",
]);

export function classifyPaymentResult(
  result: PaymentResult,
  elapsedMs: number,
  timeoutMs: number,
): ClassifiedResult {
  if (result.success && result.txHash) {
    return {
      outcome: PaymentOutcome.Success,
      txHash: result.txHash,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (elapsedMs >= timeoutMs) {
    return {
      outcome: PaymentOutcome.Timeout,
      txHash: result.txHash,
      errorCode: result.errorCode ?? "TIMEOUT",
      errorMessage: result.errorMessage ?? "Gateway response exceeded timeout",
    };
  }

  if (!result.success) {
    const code = result.errorCode ?? "UNKNOWN_ERROR";

    if (RETRYABLE_ERROR_CODES.has(code)) {
      return {
        outcome: PaymentOutcome.RetryableFailure,
        txHash: result.txHash,
        errorCode: code,
        errorMessage: result.errorMessage,
      };
    }

    if (NON_RETRYABLE_ERROR_CODES.has(code)) {
      return {
        outcome: PaymentOutcome.NonRetryableFailure,
        txHash: result.txHash,
        errorCode: code,
        errorMessage: result.errorMessage,
      };
    }

    return {
      outcome: PaymentOutcome.Unknown,
      txHash: result.txHash,
      errorCode: code,
      errorMessage: result.errorMessage,
    };
  }

  return {
    outcome: PaymentOutcome.Unknown,
    txHash: result.txHash,
    errorCode: result.errorCode ?? "NO_TX_HASH",
    errorMessage: result.errorMessage ?? "Gateway returned success without transaction hash",
  };
}
