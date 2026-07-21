import { ValidationError } from '@relcko/errors';

/**
 * Backoff strategy computing delays between job attempts.
 * attempt is the 1-based number of the failed attempt.
 */
export interface BackoffStrategy {
  /**
   * Computes the delay before the next attempt.
   *
   * @param attempt - 1-based number of the failed attempt
   * @returns delay in milliseconds
   */
  delayMs(attempt: number): number;
}

/** Options accepted by {@link ExponentialBackoffStrategy}. */
export interface ExponentialBackoffOptions {
  /** Delay before the first retry in milliseconds. */
  readonly baseDelayMs: number;
  /** Multiplier applied per attempt. Defaults to 2. */
  readonly multiplier?: number;
  /** Upper bound for any computed delay. Defaults to 60000. */
  readonly maxDelayMs?: number;
}

/**
 * Exponential backoff with an upper bound.
 */
export class ExponentialBackoffStrategy implements BackoffStrategy {
  private readonly baseDelayMs: number;
  private readonly multiplier: number;
  private readonly maxDelayMs: number;

  /**
   * @param options - backoff configuration
   * @throws {ValidationError} when options are out of range
   */
  constructor(options: ExponentialBackoffOptions) {
    this.baseDelayMs = options.baseDelayMs;
    this.multiplier = options.multiplier ?? 2;
    this.maxDelayMs = options.maxDelayMs ?? 60_000;
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

  delayMs(attempt: number): number {
    const delay = this.baseDelayMs * this.multiplier ** Math.max(0, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }
}

/**
 * Constant backoff returning the same delay for every attempt.
 */
export class FixedBackoffStrategy implements BackoffStrategy {
  private readonly delay: number;

  /**
   * @param delayMs - constant delay in milliseconds
   * @throws {ValidationError} when the delay is not positive
   */
  constructor(delayMs: number) {
    if (delayMs <= 0) {
      throw new ValidationError('delayMs must be positive', { delayMs });
    }
    this.delay = delayMs;
  }

  delayMs(_attempt: number): number {
    return this.delay;
  }
}
