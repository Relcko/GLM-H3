import { describe, expect, it } from 'vitest';

import { FixedBackoffStrategy } from './backoff-strategy';
import { InMemoryDistributedLock } from './distributed-lock';
import { Scheduler } from './scheduler';

import type { JobContext, ScheduledJob } from './scheduled-job';
import type { Clock } from '@relcko/kernel';

class FixedClock implements Clock {
  private current: number;

  constructor(start: number) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

const BASE = new Date('2026-07-19T00:00:00Z').getTime();

const instantSleep = (): { sleep: (ms: number) => Promise<void>; delays: number[] } => {
  const delays: number[] = [];
  return {
    delays,
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
  };
};

const intervalJob = (
  id: string,
  everyMs: number,
  task: (context: JobContext) => Promise<void>,
): ScheduledJob => ({
  id,
  name: id,
  schedule: { kind: 'interval', everyMs },
  task,
});

describe('Scheduler', () => {
  it('tick_should_execute_due_jobs_and_reschedule_intervals', async () => {
    const clock = new FixedClock(BASE);
    const scheduler = new Scheduler({ clock });
    let runs = 0;
    scheduler.register(
      intervalJob('job-1', 1000, () => {
        runs += 1;
        return Promise.resolve();
      }),
    );

    await scheduler.tick();
    expect(runs).toBe(0);

    clock.advance(1000);
    await scheduler.tick();
    expect(runs).toBe(1);
    expect(scheduler.nextRunAt('job-1')).toEqual(new Date(BASE + 2000));

    clock.advance(1000);
    await scheduler.tick();
    expect(runs).toBe(2);

    const executions = scheduler.jobExecutions('job-1');
    expect(executions).toHaveLength(2);
    expect(executions[0]?.status).toBe('succeeded');
    expect(executions[0]?.attempts).toBe(1);
    expect(executions[0]?.executionId).toBeDefined();
  });

  it('tick_should_run_once_jobs_a_single_time', async () => {
    const clock = new FixedClock(BASE);
    const scheduler = new Scheduler({ clock });
    let runs = 0;
    scheduler.register({
      id: 'once-job',
      name: 'once-job',
      schedule: { kind: 'once', runAt: new Date(BASE + 500) },
      task: () => {
        runs += 1;
        return Promise.resolve();
      },
    });

    clock.advance(500);
    await scheduler.tick();
    clock.advance(10_000);
    await scheduler.tick();

    expect(runs).toBe(1);
    expect(scheduler.nextRunAt('once-job')).toBeNull();
  });

  it('tick_should_execute_cron_jobs_on_their_boundary', async () => {
    const clock = new FixedClock(BASE);
    const scheduler = new Scheduler({ clock });
    let runs = 0;
    scheduler.register({
      id: 'cron-job',
      name: 'cron-job',
      schedule: { kind: 'cron', expression: '* * * * *' },
      task: () => {
        runs += 1;
        return Promise.resolve();
      },
    });

    expect(scheduler.nextRunAt('cron-job')).toEqual(new Date(BASE + 60_000));
    clock.advance(60_000);
    await scheduler.tick();

    expect(runs).toBe(1);
  });

  it('should_retry_failed_jobs_with_backoff_and_record_the_outcome', async () => {
    const clock = new FixedClock(BASE);
    const { sleep, delays } = instantSleep();
    const scheduler = new Scheduler({ clock, sleep });
    let calls = 0;
    scheduler.register({
      id: 'flaky-job',
      name: 'flaky-job',
      schedule: { kind: 'interval', everyMs: 1000 },
      retryPolicy: { maxAttempts: 3, backoff: new FixedBackoffStrategy(10) },
      task: () => {
        calls += 1;
        return calls < 3 ? Promise.reject(new Error('transient')) : Promise.resolve();
      },
    });

    clock.advance(1000);
    await scheduler.tick();

    expect(calls).toBe(3);
    expect(delays).toEqual([10, 10]);
    const executions = scheduler.jobExecutions('flaky-job');
    expect(executions[0]?.status).toBe('succeeded');
    expect(executions[0]?.attempts).toBe(3);
  });

  it('should_record_failure_after_exhausting_retries', async () => {
    const clock = new FixedClock(BASE);
    const { sleep } = instantSleep();
    const scheduler = new Scheduler({ clock, sleep });
    let calls = 0;
    scheduler.register({
      id: 'doomed-job',
      name: 'doomed-job',
      schedule: { kind: 'interval', everyMs: 1000 },
      retryPolicy: { maxAttempts: 2, backoff: new FixedBackoffStrategy(5) },
      task: () => {
        calls += 1;
        return Promise.reject(new Error('permanent'));
      },
    });

    clock.advance(1000);
    await scheduler.tick();

    expect(calls).toBe(2);
    const executions = scheduler.jobExecutions('doomed-job');
    expect(executions[0]?.status).toBe('failed');
    expect(executions[0]?.attempts).toBe(2);
    expect(executions[0]?.errorMessage).toBe('permanent');
  });

  it('should_record_skipped_locked_when_the_lock_is_held', async () => {
    const clock = new FixedClock(BASE);
    const lock = new InMemoryDistributedLock(clock);
    const scheduler = new Scheduler({ clock, lock });
    let runs = 0;
    scheduler.register(
      intervalJob('locked-job', 1000, () => {
        runs += 1;
        return Promise.resolve();
      }),
    );

    const held = await lock.acquire('scheduler:locked-job', 10_000);
    expect(held).not.toBeNull();

    clock.advance(1000);
    await scheduler.tick();

    expect(runs).toBe(0);
    const skipped = scheduler.jobExecutions('locked-job');
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.status).toBe('skipped-locked');
    expect(skipped[0]?.attempts).toBe(0);

    await held?.release();
    clock.advance(1000);
    await scheduler.tick();

    expect(runs).toBe(1);
  });

  it('should_pass_a_scoped_context_to_the_task', async () => {
    const clock = new FixedClock(BASE);
    const scheduler = new Scheduler({ clock });
    let observed: JobContext | undefined;
    scheduler.register(
      intervalJob('ctx-job', 1000, (context) => {
        observed = context;
        return Promise.resolve();
      }),
    );

    clock.advance(1000);
    await scheduler.tick();

    expect(observed?.jobId).toBe('ctx-job');
    expect(observed?.executionId).toBeDefined();
    expect(observed?.correlationId).toBeDefined();
    expect(observed?.scheduledAt).toEqual(new Date(BASE + 1000));
    expect(observed?.logger).toBeDefined();
  });

  it('unregister_should_stop_future_executions', async () => {
    const clock = new FixedClock(BASE);
    const scheduler = new Scheduler({ clock });
    let runs = 0;
    scheduler.register(
      intervalJob('removable', 1000, () => {
        runs += 1;
        return Promise.resolve();
      }),
    );

    expect(scheduler.unregister('removable')).toBe(true);
    clock.advance(5000);
    await scheduler.tick();

    expect(runs).toBe(0);
    expect(scheduler.nextRunAt('removable')).toBeUndefined();
  });

  it('start_and_stop_should_drive_ticks_from_a_timer', async () => {
    const scheduler = new Scheduler({ tickMs: 5 });
    let runs = 0;
    scheduler.register(
      intervalJob('timer-job', 1, () => {
        runs += 1;
        return Promise.resolve();
      }),
    );

    scheduler.start();
    scheduler.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    scheduler.stop();

    expect(runs).toBeGreaterThan(0);
  });
});
