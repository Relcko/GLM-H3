import type { IRecoveryPolicy, FailureInfo } from "../saga/recovery-policy.interface";

export interface RetrySchedule {
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly canRetry: boolean;
  readonly nextRetryAt: number | null;
  readonly retryDelayMs: number;
  readonly isExhausted: boolean;
}

const DEFAULT_BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 300000;

export class RetryEngine {
  constructor(
    private readonly baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  ) {}

  computeRetrySchedule(
    policy: IRecoveryPolicy,
    failure: FailureInfo,
    options?: {
      readonly maxDelayMs?: number;
    },
  ): RetrySchedule {
    const maxDelay = options?.maxDelayMs ?? MAX_DELAY_MS;
    const isExhausted = policy.isExhausted(failure.attemptNumber);
    const canRetry = !isExhausted && policy.shouldRetry(failure);

    let nextRetryAt: number | null = null;
    let retryDelayMs = 0;

    if (canRetry) {
      retryDelayMs = this.computeExponentialBackoff(failure.attemptNumber, maxDelay);
      nextRetryAt = Date.now() + retryDelayMs;
    }

    return {
      attemptNumber: failure.attemptNumber,
      maxAttempts: policy.maxAttempts,
      canRetry,
      nextRetryAt,
      retryDelayMs,
      isExhausted,
    };
  }

  isRetryDue(
    schedule: RetrySchedule,
    now: number = Date.now(),
  ): boolean {
    if (!schedule.canRetry) return false;
    if (schedule.nextRetryAt === null) return false;
    return now >= schedule.nextRetryAt;
  }

  private computeExponentialBackoff(attemptNumber: number, maxDelay: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * this.baseDelayMs * 0.5;
    return Math.min(delay + jitter, maxDelay);
  }
}
