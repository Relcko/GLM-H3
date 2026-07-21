import { describe, it, expect } from "vitest";
import { classifyPaymentResult, PaymentOutcome } from "../payment-classifier";
import type { PaymentResult } from "../../infrastructure/adapters/payment-gateway.interface";

function success(txHash: string): PaymentResult {
  return { success: true, txHash, errorCode: null, errorMessage: null };
}

function failure(code: string, msg?: string): PaymentResult {
  return { success: false, txHash: null, errorCode: code, errorMessage: msg ?? null };
}

describe("classifyPaymentResult", () => {
  it("classifies success with txHash", () => {
    const r = classifyPaymentResult(success("0xabc"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.Success);
    expect(r.txHash).toBe("0xabc");
  });

  it("classifies timeout when elapsed exceeds timeout and result has no txHash", () => {
    const r = classifyPaymentResult({ success: false, txHash: null, errorCode: null, errorMessage: "Gateway timeout" }, 35000, 30000);
    expect(r.outcome).toBe(PaymentOutcome.Timeout);
  });

  it("classifies late-successful response as Success, not Timeout", () => {
    const r = classifyPaymentResult(success("0xlate"), 35000, 30000);
    expect(r.outcome).toBe(PaymentOutcome.Success);
    expect(r.txHash).toBe("0xlate");
  });

  it("classifies retryable failure for GATEWAY_TIMEOUT", () => {
    const r = classifyPaymentResult(failure("GATEWAY_TIMEOUT"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.RetryableFailure);
  });

  it("classifies retryable failure for NETWORK_ERROR", () => {
    const r = classifyPaymentResult(failure("NETWORK_ERROR", "Connection reset"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.RetryableFailure);
    expect(r.errorMessage).toBe("Connection reset");
  });

  it("classifies non-retryable failure for INVALID_ACCOUNT", () => {
    const r = classifyPaymentResult(failure("INVALID_ACCOUNT"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.NonRetryableFailure);
  });

  it("classifies non-retryable failure for ACCOUNT_FROZEN", () => {
    const r = classifyPaymentResult(failure("ACCOUNT_FROZEN"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.NonRetryableFailure);
  });

  it("classifies unknown error code as Unknown", () => {
    const r = classifyPaymentResult(failure("MYSTERY_CODE"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.Unknown);
  });

  it("classifies success without txHash as Unknown", () => {
    const r = classifyPaymentResult({ success: true, txHash: null, errorCode: null, errorMessage: null }, 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.Unknown);
  });

  it("classifies RATE_LIMITED as retryable", () => {
    const r = classifyPaymentResult(failure("RATE_LIMITED"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.RetryableFailure);
  });

  it("classifies BLOCKED_BY_REGULATION as non-retryable", () => {
    const r = classifyPaymentResult(failure("BLOCKED_BY_REGULATION"), 100, 30000);
    expect(r.outcome).toBe(PaymentOutcome.NonRetryableFailure);
  });
});
