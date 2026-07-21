import type { Clock } from '@relcko/kernel';

/**
 * Deterministic {@link Clock} for tests.
 *
 * Time only moves when {@link FixedClock.advance} or {@link FixedClock.set}
 * is called, making time-dependent logic fully reproducible (Playbook 2.6).
 */
export class FixedClock implements Clock {
  private current: number;

  /**
   * @param start - initial instant (Date or epoch milliseconds)
   */
  constructor(start: Date | number = 0) {
    this.current = start instanceof Date ? start.getTime() : start;
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current;
  }

  /**
   * Moves the clock forward.
   *
   * @param ms - milliseconds to advance
   */
  advance(ms: number): void {
    this.current += ms;
  }

  /**
   * Moves the clock to an absolute instant.
   *
   * @param time - new instant (Date or epoch milliseconds)
   */
  set(time: Date | number): void {
    this.current = time instanceof Date ? time.getTime() : time;
  }
}
