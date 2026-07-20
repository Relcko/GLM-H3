import { describe, expect, it } from 'vitest';

import { InMemoryQueryBus } from './query-bus';
import { DuplicateHandlerError, HandlerExecutionFailedError, UnknownQueryError } from '../errors/application-error';

import type { Query } from '../message';
import type { QueryHandler } from './query-bus';
import type { CorrelationId } from '@relcko/types';

class TestDomainError extends Error {
  readonly code = 'TEST_CODE';
}

interface TestPayload {
  readonly query: string;
}

const mockQuery = <TPayload>(type: string, payload: TPayload, correlationId: string): Query<TPayload> => ({
  type,
  payload,
  metadata: { messageId: crypto.randomUUID(), correlationId: correlationId as CorrelationId, timestamp: Date.now() },
});

describe('InMemoryQueryBus', () => {
  it('dispatches a query to its handler', async () => {
    const bus = new InMemoryQueryBus();
    const handler: QueryHandler<Query<TestPayload>, string> = {
      queryType: 'test-query',
      handle(q) {
        return Promise.resolve(`answer-${q.payload.query}`);
      },
    };
    bus.register(handler);
    const result = await bus.dispatch<string>(mockQuery('test-query', { query: 'hello' }, crypto.randomUUID()));
    expect(result).toBe('answer-hello');
  });

  it('rejects unknown queries', async () => {
    const bus = new InMemoryQueryBus();
    await expect(bus.dispatch(mockQuery('unknown', {}, crypto.randomUUID()))).rejects.toThrow(UnknownQueryError);
  });

  it('prevents duplicate handler registration', () => {
    const bus = new InMemoryQueryBus();
    const handler: QueryHandler = { queryType: 'dup', handle() { return Promise.resolve(null); } };
    bus.register(handler);
    const dup: QueryHandler = { queryType: 'dup', handle() { return Promise.resolve(null); } };
    expect(() => { bus.register(dup); }).toThrow(DuplicateHandlerError);
  });

  it('checks handler existence', () => {
    const bus = new InMemoryQueryBus();
    expect(bus.hasHandler('test')).toBe(false);
    bus.register({ queryType: 'test', handle() { return Promise.resolve(null); } });
    expect(bus.hasHandler('test')).toBe(true);
  });

  it('wraps handler errors in HandlerExecutionFailedError', async () => {
    const bus = new InMemoryQueryBus();
    bus.register({
      queryType: 'fail',
      handle() {
        return Promise.reject(new Error('query crashed'));
      },
    });
    await expect(bus.dispatch(mockQuery('fail', {}, crypto.randomUUID()))).rejects.toThrow(HandlerExecutionFailedError);
  });

  it('preserves non-DomainError instances as HandlerExecutionFailedError', async () => {
    const bus = new InMemoryQueryBus();
    bus.register({
      queryType: 'domain-fail',
      handle() {
        return Promise.reject(new TestDomainError('domain-specific'));
      },
    });
    const dispatch = bus.dispatch(mockQuery('domain-fail', {}, crypto.randomUUID()));
    await expect(dispatch).rejects.toThrow(HandlerExecutionFailedError);
  });

  it('preserves the original error as cause', async () => {
    const bus = new InMemoryQueryBus();
    const original = new Error('root cause');
    bus.register({
      queryType: 'cause-test',
      handle() {
        return Promise.reject(original);
      },
    });
    try {
      await bus.dispatch(mockQuery('cause-test', {}, crypto.randomUUID()));
    } catch (error) {
      expect(error).toBeInstanceOf(HandlerExecutionFailedError);
      expect((error as Error).cause).toBe(original);
    }
  });

  it('supports multiple handlers for different queries', async () => {
    const bus = new InMemoryQueryBus();
    bus.register({ queryType: 'q-a', handle() { return Promise.resolve('aaa'); } });
    bus.register({ queryType: 'q-b', handle() { return Promise.resolve('bbb'); } });
    await expect(bus.dispatch<string>(mockQuery('q-a', {}, crypto.randomUUID()))).resolves.toBe('aaa');
    await expect(bus.dispatch<string>(mockQuery('q-b', {}, crypto.randomUUID()))).resolves.toBe('bbb');
  });

  it('returns complex result types', async () => {
    const bus = new InMemoryQueryBus();
    bus.register({
      queryType: 'get-data',
      handle() {
        return Promise.resolve({ items: [1, 2, 3], total: 3 });
      },
    });
    const result = await bus.dispatch<{ items: readonly number[]; total: number }>(
      mockQuery('get-data', {}, crypto.randomUUID()),
    );
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.total).toBe(3);
  });
});
