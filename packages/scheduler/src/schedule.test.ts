import { describe, expect, it } from 'vitest';

import { nextRunAfter } from './schedule';

import type { Schedule } from './schedule';

const after = new Date('2026-07-19T00:00:00Z');

describe('nextRunAfter', () => {
  it('interval_should_add_the_delay', () => {
    const schedule: Schedule = { kind: 'interval', everyMs: 5000 };

    expect(nextRunAfter(schedule, after)).toEqual(new Date(after.getTime() + 5000));
  });

  it('once_should_return_runAt_only_when_it_is_in_the_future', () => {
    const future: Schedule = { kind: 'once', runAt: new Date(after.getTime() + 1) };
    const past: Schedule = { kind: 'once', runAt: after };

    expect(nextRunAfter(future, after)).toEqual(new Date(after.getTime() + 1));
    expect(nextRunAfter(past, after)).toBeNull();
  });

  it('cron_should_delegate_to_the_cron_expression', () => {
    const schedule: Schedule = { kind: 'cron', expression: '*/30 * * * *' };

    expect(nextRunAfter(schedule, after)).toEqual(new Date('2026-07-19T00:30:00Z'));
  });
});
