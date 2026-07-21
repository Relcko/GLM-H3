import { InProcessCommandBus, InProcessQueryBus } from '@relcko/cqrs';
import { describe, expect, it } from 'vitest';


import {
  createTestCommand,
  createTestQuery,
  RecordingBehavior,
  SpyCommandHandler,
  SpyQueryHandler,
  TEST_CORRELATION_ID,
} from './cqrs-test-doubles';

import type { Command, Query } from '@relcko/cqrs';

describe('CQRS test doubles', () => {
  it('createTestCommand_should_use_the_fixed_correlation_id', () => {
    const command = createTestCommand('ApproveOrder', { orderId: 'o-1' });

    expect(command.type).toBe('ApproveOrder');
    expect(command.metadata.correlationId).toBe(TEST_CORRELATION_ID);
    expect(command.metadata.timestamp).toBe(0);
  });

  it('createTestQuery_should_use_the_fixed_correlation_id', () => {
    const query = createTestQuery('GetOrder', { orderId: 'o-1' });

    expect(query.type).toBe('GetOrder');
    expect(query.metadata.correlationId).toBe(TEST_CORRELATION_ID);
  });

  it('SpyCommandHandler_should_record_and_respond', async () => {
    const bus = new InProcessCommandBus();
    const spy = new SpyCommandHandler<Command<{ orderId: string }>, string>(
      'ApproveOrder',
      (command) => `ok:${command.payload.orderId}`,
    );
    bus.register(spy);

    const result = await bus.dispatch<string>(createTestCommand('ApproveOrder', { orderId: 'o-1' }));

    expect(result).toBe('ok:o-1');
    expect(spy.callCount()).toBe(1);
    expect(spy.receivedCommands()[0]?.payload.orderId).toBe('o-1');
  });

  it('SpyQueryHandler_should_record_and_respond', async () => {
    const bus = new InProcessQueryBus();
    const spy = new SpyQueryHandler<Query<{ orderId: string }>, string>(
      'GetOrder',
      (query) => `order:${query.payload.orderId}`,
    );
    bus.register(spy);

    const result = await bus.dispatch<string>(createTestQuery('GetOrder', { orderId: 'o-2' }));

    expect(result).toBe('order:o-2');
    expect(spy.receivedQueries()).toHaveLength(1);
  });

  it('RecordingBehavior_should_capture_execution_order_and_contexts', async () => {
    const trace: string[] = [];
    const bus = new InProcessCommandBus({
      behaviors: [new RecordingBehavior('outer', trace), new RecordingBehavior('inner', trace)],
    });
    bus.register(new SpyCommandHandler('ApproveOrder'));

    await bus.dispatch(createTestCommand('ApproveOrder', null));

    expect(trace).toEqual(['outer:before', 'inner:before', 'inner:after', 'outer:after']);
  });
});
