import { describe, expect, it } from 'vitest';

import { FixedClock } from './fixed-clock';

describe('FixedClock', () => {
  it('should_start_at_zero_by_default', () => {
    const clock = new FixedClock();

    expect(clock.nowMs()).toBe(0);
    expect(clock.now()).toEqual(new Date(0));
  });

  it('should_accept_a_date_or_epoch_start', () => {
    expect(new FixedClock(1_000).nowMs()).toBe(1_000);
    expect(new FixedClock(new Date('2026-07-19T00:00:00Z')).now()).toEqual(
      new Date('2026-07-19T00:00:00Z'),
    );
  });

  it('should_move_only_when_advanced_or_set', () => {
    const clock = new FixedClock(1_000);

    clock.advance(500);
    expect(clock.nowMs()).toBe(1_500);

    clock.set(10_000);
    expect(clock.now()).toEqual(new Date(10_000));
  });
});
