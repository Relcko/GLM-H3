import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { ExponentialBackoffStrategy, FixedBackoffStrategy } from './backoff-strategy';
import { defaultJobRetryPolicy, DEFAULT_JOB_MAX_ATTEMPTS } from './retry-policy';

describe('ExponentialBackoffStrategy', () => {
  it('should_grow_exponentially_and_apply_the_cap', () => {
    const backoff = new ExponentialBackoffStrategy({
      baseDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 250,
    });

    expect(backoff.delayMs(1)).toBe(100);
    expect(backoff.delayMs(2)).toBe(200);
    expect(backoff.delayMs(3)).toBe(250);
    expect(backoff.delayMs(10)).toBe(250);
  });

  it('should_validate_options', () => {
    expect(() => new ExponentialBackoffStrategy({ baseDelayMs: 0 })).toThrow(ValidationError);
    expect(() => new ExponentialBackoffStrategy({ baseDelayMs: 1, multiplier: 0 })).toThrow(
      ValidationError,
    );
    expect(
      () => new ExponentialBackoffStrategy({ baseDelayMs: 100, maxDelayMs: 50 }),
    ).toThrow(ValidationError);
  });
});

describe('FixedBackoffStrategy', () => {
  it('should_return_a_constant_delay', () => {
    const backoff = new FixedBackoffStrategy(500);

    expect(backoff.delayMs(1)).toBe(500);
    expect(backoff.delayMs(5)).toBe(500);
  });

  it('should_validate_the_delay', () => {
    expect(() => new FixedBackoffStrategy(0)).toThrow(ValidationError);
    expect(() => new FixedBackoffStrategy(-1)).toThrow(ValidationError);
  });
});

describe('defaultJobRetryPolicy', () => {
  it('should_cap_attempts_at_the_playbook_default', () => {
    const policy = defaultJobRetryPolicy();

    expect(policy.maxAttempts).toBe(DEFAULT_JOB_MAX_ATTEMPTS);
    expect(policy.maxAttempts).toBe(3);
    expect(policy.backoff.delayMs(1)).toBe(1000);
  });
});
