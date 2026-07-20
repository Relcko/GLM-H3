import { describe, expect, it } from 'vitest';

import { SystemClock, systemClock } from './clock';

describe('SystemClock', () => {
  it('now_should_return_the_current_instant', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const value = clock.now();
    const after = Date.now();

    expect(value.getTime()).toBeGreaterThanOrEqual(before);
    expect(value.getTime()).toBeLessThanOrEqual(after);
  });

  it('nowMs_should_return_epoch_milliseconds', () => {
    const clock = new SystemClock();
    expect(Math.abs(clock.nowMs() - Date.now())).toBeLessThan(1000);
  });

  it('systemClock_should_be_a_shared_clock_instance', () => {
    expect(systemClock.now()).toBeInstanceOf(Date);
  });
});
