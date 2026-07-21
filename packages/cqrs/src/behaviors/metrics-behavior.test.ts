import { InMemoryMetricsProvider } from '@relcko/telemetry';
import { describe, expect, it } from 'vitest';


import {
  CQRS_MESSAGES_TOTAL,
  CQRS_MESSAGE_DURATION_MS,
  MetricsBehavior,
} from './metrics-behavior';

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

describe('MetricsBehavior', () => {
  it('should_count_successes_and_observe_latency', async () => {
    const metrics = new InMemoryMetricsProvider();
    const behavior = new MetricsBehavior(metrics);

    await behavior.handle({}, context, () => Promise.resolve('ok'));

    const snapshot = metrics.snapshot();
    expect(
      snapshot.counters.get(`${CQRS_MESSAGES_TOTAL}{kind=command,result=success,type=ApproveOrder}`),
    ).toBe(1);
    const latency = snapshot.histograms.get(
      `${CQRS_MESSAGE_DURATION_MS}{kind=command,type=ApproveOrder}`,
    );
    expect(latency?.count).toBe(1);
    expect(latency?.sum).toBeGreaterThanOrEqual(0);
  });

  it('should_count_errors_and_rethrow', async () => {
    const metrics = new InMemoryMetricsProvider();
    const behavior = new MetricsBehavior(metrics);
    const failure = new Error('boom');

    await expect(behavior.handle({}, context, () => Promise.reject(failure))).rejects.toBe(
      failure,
    );

    const snapshot = metrics.snapshot();
    expect(
      snapshot.counters.get(`${CQRS_MESSAGES_TOTAL}{kind=command,result=error,type=ApproveOrder}`),
    ).toBe(1);
  });
});
