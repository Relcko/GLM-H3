import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { ExponentialBackoffRetryPolicy, NoRetryPolicy } from './retry-policy';

describe('ExponentialBackoffRetryPolicy', () => {
  it('should_default_to_three_attempts_per_the_playbook', () => {
    const policy = new ExponentialBackoffRetryPolicy();
    expect(policy.maxAttempts).toBe(3);
  });

  it('shouldRetry_should_allow_retries_until_the_cap', () => {
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 3 });
    const error = new Error('transient');

    expect(policy.shouldRetry(1, error)).toBe(true);
    expect(policy.shouldRetry(2, error)).toBe(true);
    expect(policy.shouldRetry(3, error)).toBe(false);
  });

  it('shouldRetry_should_honor_the_retryable_predicate', () => {
    const policy = new ExponentialBackoffRetryPolicy({
      maxAttempts: 5,
      retryable: (error) => error instanceof Error && error.message === 'transient',
    });

    expect(policy.shouldRetry(1, new Error('transient'))).toBe(true);
    expect(policy.shouldRetry(1, new Error('permanent'))).toBe(false);
  });

  it('delayMs_should_grow_exponentially_and_be_capped', () => {
    const policy = new ExponentialBackoffRetryPolicy({
      baseDelayMs: 100,
      multiplier: 3,
      maxDelayMs: 1000,
    });

    expect(policy.delayMs(1)).toBe(100);
    expect(policy.delayMs(2)).toBe(300);
    expect(policy.delayMs(3)).toBe(900);
    expect(policy.delayMs(4)).toBe(1000);
  });

  it('should_validate_constructor_options', () => {
    expect(() => new ExponentialBackoffRetryPolicy({ maxAttempts: 0 })).toThrow(ValidationError);
    expect(() => new ExponentialBackoffRetryPolicy({ baseDelayMs: 0 })).toThrow(ValidationError);
    expect(() => new ExponentialBackoffRetryPolicy({ multiplier: 0.5 })).toThrow(ValidationError);
    expect(
      () => new ExponentialBackoffRetryPolicy({ baseDelayMs: 100, maxDelayMs: 50 }),
    ).toThrow(ValidationError);
  });
});

describe('NoRetryPolicy', () => {
  it('should_allow_a_single_attempt', () => {
    const policy = new NoRetryPolicy();

    expect(policy.maxAttempts).toBe(1);
    expect(policy.shouldRetry(1, new Error('x'))).toBe(false);
    expect(policy.delayMs(1)).toBe(0);
  });
});
