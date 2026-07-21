import { describe, expect, it } from 'vitest';

import { createCommand, createQuery } from './message';

import type { CorrelationId } from '@relcko/types';

const correlationId = crypto.randomUUID() as CorrelationId;

describe('createCommand', () => {
  it('should_build_a_command_with_generated_metadata', () => {
    const command = createCommand('ApproveOrder', { orderId: 'o-1' }, correlationId);

    expect(command.type).toBe('ApproveOrder');
    expect(command.payload).toEqual({ orderId: 'o-1' });
    expect(command.metadata.messageId).toBeDefined();
    expect(command.metadata.correlationId).toBe(correlationId);
    expect(command.metadata.timestamp).toBeGreaterThan(0);
  });

  it('should_honor_metadata_overrides', () => {
    const command = createCommand('ApproveOrder', null, correlationId, {
      messageId: 'msg-1',
      timestamp: 42,
    });

    expect(command.metadata.messageId).toBe('msg-1');
    expect(command.metadata.timestamp).toBe(42);
  });
});

describe('createQuery', () => {
  it('should_build_a_query_with_generated_metadata', () => {
    const query = createQuery('GetOrder', { orderId: 'o-1' }, correlationId);

    expect(query.type).toBe('GetOrder');
    expect(query.payload).toEqual({ orderId: 'o-1' });
    expect(query.metadata.correlationId).toBe(correlationId);
  });
});
