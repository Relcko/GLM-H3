import { describe, expect, it } from 'vitest';

import { RetryBehavior } from './retry-behavior';

import type { RetryBehaviorPolicy } from './retry-behavior';
import type { MessageContext } from '../pipeline';
import type { CorrelationId } from '@relcko/types';

const context: MessageContext = {
  kind: 'command',
  messageType: 'ApproveOrder',
  metadata: {
    messageId: 'msg-1',
    correlationId: 'corr-1' as CorrelationId,
    timestamp: 1,
  },
};

const policy = (maxAttempts: number, retryable = true): RetryBehaviorPolicy => ({
  maxAttempts,
  shouldRetry: () => retryable,
  delayMs: (attempt) => attempt * 10,
});

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

describe('RetryBehavior', () => {
  it('should_return_the_result_when_the_first_attempt_succeeds', async () => {
    const { sleep, delays } = instantSleep();
    const behavior = new RetryBehavior(policy(3), sleep);
    let calls = 0;

    const result = await behavior.handle({}, context, () => {
      calls += 1;
      return Promise.resolve('ok');
    });

    expect(result).toBe('ok');
    expect(calls).toBe(1);
    expect(delays).toEqual([]);
  });

  it('should_retry_until_the_handler_succeeds', async () => {
    const { sleep, delays } = instantSleep();
    const behavior = new RetryBehavior(policy(3), sleep);
    let calls = 0;

    const result = await behavior.handle({}, context, () => {
      calls += 1;
      return calls < 3 ? Promise.reject(new Error('transient')) : Promise.resolve('recovered');
    });

    expect(result).toBe('recovered');
    expect(calls).toBe(3);
    expect(delays).toEqual([10, 20]);
  });

  it('should_rethrow_the_last_error_after_exhausting_attempts', async () => {
    const { sleep } = instantSleep();
    const behavior = new RetryBehavior(policy(2), sleep);
    const failure = new Error('permanent');
    let calls = 0;

    await expect(
      behavior.handle({}, context, () => {
        calls += 1;
        return Promise.reject(failure);
      }),
    ).rejects.toBe(failure);
    expect(calls).toBe(2);
  });

  it('should_not_retry_when_the_policy_rejects_the_error', async () => {
    const { sleep, delays } = instantSleep();
    const behavior = new RetryBehavior(policy(5, false), sleep);
    let calls = 0;

    await expect(
      behavior.handle({}, context, () => {
        calls += 1;
        return Promise.reject(new Error('fatal'));
      }),
    ).rejects.toThrow('fatal');
    expect(calls).toBe(1);
    expect(delays).toEqual([]);
  });
});
