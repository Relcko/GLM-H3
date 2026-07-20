import { ConflictError, ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { JobRegistry } from './job-registry';

import type { Schedule } from './schedule';
import type { ScheduledJob } from './scheduled-job';

const job = (id: string, schedule?: Schedule): ScheduledJob => ({
  id,
  name: `Job ${id}`,
  schedule: schedule ?? { kind: 'interval', everyMs: 1000 },
  task: () => Promise.resolve(),
});

describe('JobRegistry', () => {
  it('should_register_get_list_and_unregister_jobs', () => {
    const registry = new JobRegistry();

    registry.register(job('a'));
    registry.register(job('b'));

    expect(registry.has('a')).toBe(true);
    expect(registry.get('b')?.name).toBe('Job b');
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.list().map((entry) => entry.id)).toEqual(['a', 'b']);

    expect(registry.unregister('a')).toBe(true);
    expect(registry.unregister('a')).toBe(false);
    expect(registry.has('a')).toBe(false);
  });

  it('register_should_reject_duplicate_ids', () => {
    const registry = new JobRegistry();
    registry.register(job('a'));

    expect(() => { registry.register(job('a')); }).toThrow(ConflictError);
  });

  it('register_should_validate_interval_schedules', () => {
    const registry = new JobRegistry();

    expect(() => { registry.register(job('a', { kind: 'interval', everyMs: 0 })); }).toThrow(
      ValidationError,
    );
    expect(() => { registry.register(job('b', { kind: 'interval', everyMs: -5 })); }).toThrow(
      ValidationError,
    );
    expect(() => { registry.register(job('c', { kind: 'interval', everyMs: 100 })); }).not.toThrow();
  });

  it('register_should_validate_cron_schedules', () => {
    const registry = new JobRegistry();

    expect(() => { registry.register(job('a', { kind: 'cron', expression: 'invalid' })); }).toThrow(
      ValidationError,
    );
    expect(
      () => { registry.register(job('b', { kind: 'cron', expression: '*/5 * * * *' })); },
    ).not.toThrow();
  });

  it('register_should_validate_once_schedules', () => {
    const registry = new JobRegistry();

    expect(
      () => { registry.register(job('a', { kind: 'once', runAt: new Date(Number.NaN) })); },
    ).toThrow(ValidationError);
    expect(
      () => { registry.register(job('b', { kind: 'once', runAt: new Date('2026-07-20T00:00:00Z') })); },
    ).not.toThrow();
  });

  it('register_should_reject_blank_identifiers', () => {
    const registry = new JobRegistry();

    expect(() => { registry.register(job(' ')); }).toThrow(ValidationError);
  });
});
