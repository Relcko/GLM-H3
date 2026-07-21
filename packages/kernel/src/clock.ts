/**
 * Clock abstraction.
 *
 * Business logic must never read the wall clock directly (Playbook 2.6 -
 * Deterministic Behavior). All time-dependent code receives a {@link Clock}
 * so tests, replays, and simulations can substitute a controlled source.
 */
export interface Clock {
  /**
   * Returns the current instant as a {@link Date}.
   * @returns current point in time
   */
  now(): Date;

  /**
   * Returns the current instant as epoch milliseconds.
   * @returns epoch milliseconds
   */
  nowMs(): number;
}

/**
 * Production {@link Clock} backed by the system wall clock.
 */
export class SystemClock implements Clock {
  /** @returns current wall-clock time */
  public now(): Date {
    return new Date();
  }

  /** @returns current wall-clock time in epoch milliseconds */
  public nowMs(): number {
    return Date.now();
  }
}

/** Shared default {@link SystemClock} instance. */
export const systemClock: Clock = new SystemClock();
