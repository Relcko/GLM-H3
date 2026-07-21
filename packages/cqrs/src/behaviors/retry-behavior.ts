import type { MessageContext, PipelineBehavior } from '../pipeline';

/**
 * Retry policy port for {@link RetryBehavior}.
 *
 * Structurally compatible with the event bus RetryPolicy: any policy with
 * this shape (e.g. ExponentialBackoffRetryPolicy) plugs in without an
 * adapter. attempt is the 1-based number of the failed attempt.
 */
export interface RetryBehaviorPolicy {
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

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Pipeline behavior re-executing failed messages per a retry policy
 * (Playbook 6.2 - retry with backoff; 2.4 - hard cap on attempts).
 */
export class RetryBehavior implements PipelineBehavior {
  private readonly policy: RetryBehaviorPolicy;
  private readonly sleep: (ms: number) => Promise<void>;

  /**
   * @param policy - retry policy to apply
   * @param sleep - sleep function between attempts; injectable for tests
   */
  constructor(policy: RetryBehaviorPolicy, sleep: (ms: number) => Promise<void> = defaultSleep) {
    this.policy = policy;
    this.sleep = sleep;
  }

  async handle<TResult>(
    _message: unknown,
    _context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt += 1) {
      try {
        return await next();
      } catch (error) {
        lastError = error;
        if (attempt < this.policy.maxAttempts && this.policy.shouldRetry(attempt, error)) {
          await this.sleep(this.policy.delayMs(attempt));
          continue;
        }
        break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
