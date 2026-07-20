import { describe, expect, it } from 'vitest';

import { createEnvelope } from './index';

import type { CorrelationId } from '@relcko/types';

describe('createEnvelope', () => {
  it('creates an envelope with all fields', () => {
    const correlationId = crypto.randomUUID() as CorrelationId;
    const envelope = createEnvelope('TestAggregate', 'agg-1', 'TestEvent', { foo: 'bar' }, correlationId, {
      eventVersion: 2,
      producer: 'test-service',
    });

    expect(envelope.metadata.eventId).toBeDefined();
    expect(envelope.metadata.eventType).toBe('TestEvent');
    expect(envelope.metadata.eventVersion).toBe(2);
    expect(envelope.metadata.aggregateId).toBe('agg-1');
    expect(envelope.metadata.aggregateType).toBe('TestAggregate');
    expect(envelope.metadata.correlationId).toBe(correlationId);
    expect(envelope.metadata.timestamp).toBeGreaterThan(0);
    expect(envelope.metadata.producer).toBe('test-service');
    expect(envelope.payload).toEqual({ foo: 'bar' });
  });

  it('uses defaults when options omitted', () => {
    const correlationId = crypto.randomUUID() as CorrelationId;
    const envelope = createEnvelope('A', 'b', 'E', null, correlationId);

    expect(envelope.metadata.eventVersion).toBe(1);
    expect(envelope.metadata.producer).toBe('unknown');
    expect(envelope.metadata.causationId).toBeUndefined();
  });
});
