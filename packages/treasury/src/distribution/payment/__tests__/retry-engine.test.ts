import { describe, it, expect } from "vitest";
import { RetryEngine } from "../retry-engine";
import type { IRecoveryPolicy } from "../../saga/recovery-policy.interface";
import { RecoveryStrategy } from "../../domain/value-objects";

function makePolicy(
  maxAttempts: number,
  strategy: RecoveryStrategy = RecoveryStrategy.ReAttempt,
  shouldRetry: boolean = true,
): IRecoveryPolicy {
  return {
    maxAttempts,
    strategy,
    shouldRetry: () => shouldRetry,
    isExhausted: (attempts: number) => attempts >= maxAttempts,
  };
}

describe("RetryEngine", () => {
  const engine = new RetryEngine(5000);

  it("schedules retry with exponential backoff on first attempt", () => {
    const schedule = engine.computeRetrySchedule(
      makePolicy(3),
      { errorCode: "TIMEOUT", reason: "Gateway timeout", attemptNumber: 1 },
    );
    expect(schedule.canRetry).toBe(true);
    expect(schedule.attemptNumber).toBe(1);
    expect(schedule.nextRetryAt).not.toBeNull();
    expect(schedule.retryDelayMs).toBeGreaterThanOrEqual(5000);
    expect(schedule.isExhausted).toBe(false);
  });

  it("increases delay exponentially on subsequent attempts", () => {
    const schedule1 = engine.computeRetrySchedule(
      makePolicy(5),
      { errorCode: "TIMEOUT", reason: "Timeout", attemptNumber: 1 },
    );
    const schedule2 = engine.computeRetrySchedule(
      makePolicy(5),
      { errorCode: "TIMEOUT", reason: "Timeout", attemptNumber: 2 },
    );
    expect(schedule2.retryDelayMs).toBeGreaterThan(schedule1.retryDelayMs);
  });

  it("reports exhausted when maxAttempts reached", () => {
    const schedule = engine.computeRetrySchedule(
      makePolicy(3),
      { errorCode: "TIMEOUT", reason: "Exceeded", attemptNumber: 3 },
    );
    expect(schedule.isExhausted).toBe(true);
    expect(schedule.canRetry).toBe(false);
    expect(schedule.nextRetryAt).toBeNull();
  });

  it("does not retry when policy says not to", () => {
    const schedule = engine.computeRetrySchedule(
      makePolicy(3, RecoveryStrategy.ReAttempt, false),
      { errorCode: "FRAUD", reason: "Fraud suspected", attemptNumber: 1 },
    );
    expect(schedule.canRetry).toBe(false);
    expect(schedule.nextRetryAt).toBeNull();
  });

  it("respects maxDelay option", () => {
    const limited = new RetryEngine(100000);
    const schedule = limited.computeRetrySchedule(
      makePolicy(10),
      { errorCode: "TIMEOUT", reason: "Timeout", attemptNumber: 5 },
      { maxDelayMs: 10000 },
    );
    expect(schedule.retryDelayMs).toBeLessThanOrEqual(10000);
  });

  it("isRetryDue returns true when now is past nextRetryAt", () => {
    const schedule = engine.computeRetrySchedule(
      makePolicy(3),
      { errorCode: "TIMEOUT", reason: "Timeout", attemptNumber: 1 },
    );
    expect(engine.isRetryDue(schedule, Date.now() + 60000)).toBe(true);
  });

  it("isRetryDue returns false when nextRetryAt is null", () => {
    const schedule = engine.computeRetrySchedule(
      makePolicy(1),
      { errorCode: "FATAL", reason: "Fatal", attemptNumber: 1 },
    );
    expect(engine.isRetryDue(schedule, Date.now() + 60000)).toBe(false);
  });
});
