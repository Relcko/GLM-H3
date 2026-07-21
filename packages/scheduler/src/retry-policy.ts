import { ExponentialBackoffStrategy } from './backoff-strategy';

import type { BackoffStrategy } from './backoff-strategy';

/**
 * Retry policy for scheduled job executions (Playbook 6.2 - retry with
 * backoff; 2.4 - hard cap on attempts).
 */
export interface JobRetryPolicy {
  /** Total number of attempts including the initial execution. */
  readonly maxAttempts: number;
  /** Backoff strategy computing delays between attempts. */
  readonly backoff: BackoffStrategy;
  /** Predicate deciding whether an error is retryable. Defaults to all errors. */
  readonly retryable?: (error: unknown) => boolean;
}

/** Default maximum attempts applied to jobs without an explicit policy. */
export const DEFAULT_JOB_MAX_ATTEMPTS = 3;

/**
 * Builds the default job retry policy: 3 attempts with exponential backoff
 * starting at 1 second, capped at 60 seconds.
 *
 * @returns the default job retry policy
 */
export function defaultJobRetryPolicy(): JobRetryPolicy {
  return {
    maxAttempts: DEFAULT_JOB_MAX_ATTEMPTS,
    backoff: new ExponentialBackoffStrategy({ baseDelayMs: 1_000, multiplier: 2, maxDelayMs: 60_000 }),
  };
}
