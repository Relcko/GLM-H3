import { ValidationError } from '@relcko/errors';

/**
 * Retry policy for event handler execution.
 *
 * attempt is always the 1-based number of the attempt that just failed.
 * Financial operations must cap retries (Playbook 2.4 - max 3 attempts,
 * then escalation).
 */
export interface RetryPolicy {
  /** Total number of attempts including the initial execution. */
  readonly maxAttempts: number;

  /**
   * Decides whether another attempt is allowed after a failure.
   *
   * @param attempt - 1-based number of the failed attempt
   * @param error - error thrown by the failed attempt
   * @returns true when another attempt should be made
   */
  shouldRetry(attempt: number, error: unknown): boolean;

  /**
   * Computes the delay before the next attempt.
   *
   * @param attempt - 1-based number of the failed attempt
   * @returns delay in milliseconds
   */
  delayMs(attempt: number): number;
}

/** Options accepted by {@link ExponentialBackoffRetryPolicy}. */
export interface ExponentialBackoffRetryPolicyOptions {
  /** Total attempts including the initial execution. Defaults to 3 (Playbook 2.4). */
  readonly maxAttempts?: number;
  /** Delay before the first retry in milliseconds. Defaults to 100. */
  readonly baseDelayMs?: number;
  /** Multiplier applied per attempt. Defaults to 2. */
  readonly multiplier?: number;
  /** Upper bound for any computed delay. Defaults to 5000. */
  readonly maxDelayMs?: number;
  /** Predicate deciding whether an error is retryable. Defaults to all errors. */
  readonly retryable?: (error: unknown) => boolean;
}

/**
 * Exponential backoff retry policy with a hard attempt cap.
 */
export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly multiplier: number;
  private readonly maxDelayMs: number;
  private readonly retryable: (error: unknown) => boolean;

  /**
   * @param options - backoff configuration
   * @throws {ValidationError} when numeric options are out of range
   */
  constructor(options?: ExponentialBackoffRetryPolicyOptions) {
    this.maxAttempts = options?.maxAttempts ?? 3;
    this.baseDelayMs = options?.baseDelayMs ?? 100;
    this.multiplier = options?.multiplier ?? 2;
    this.maxDelayMs = options?.maxDelayMs ?? 5000;
    this.retryable = options?.retryable ?? ((): boolean => true);

    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) {
      throw new ValidationError('maxAttempts must be a positive integer', {
        maxAttempts: this.maxAttempts,
      });
    }
    if (this.baseDelayMs <= 0) {
      throw new ValidationError('baseDelayMs must be positive', { baseDelayMs: this.baseDelayMs });
    }
    if (this.multiplier < 1) {
      throw new ValidationError('multiplier must be at least 1', { multiplier: this.multiplier });
    }
    if (this.maxDelayMs < this.baseDelayMs) {
      throw new ValidationError('maxDelayMs must be greater than or equal to baseDelayMs', {
        maxDelayMs: this.maxDelayMs,
        baseDelayMs: this.baseDelayMs,
      });
    }
  }

  shouldRetry(attempt: number, error: unknown): boolean {
    return attempt < this.maxAttempts && this.retryable(error);
  }

  delayMs(attempt: number): number {
    const delay = this.baseDelayMs * this.multiplier ** Math.max(0, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }
}

/**
 * Retry policy that never retries (single attempt).
 */
export class NoRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;

  constructor() {
    this.maxAttempts = 1;
  }

  shouldRetry(_attempt: number, _error: unknown): boolean {
    return false;
  }

  delayMs(_attempt: number): number {
    return 0;
  }
}
