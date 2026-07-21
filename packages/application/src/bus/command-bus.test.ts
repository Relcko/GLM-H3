import { describe, expect, it } from 'vitest';

import { InMemoryCommandBus } from './command-bus';
import { DuplicateHandlerError, HandlerExecutionFailedError, UnknownCommandError } from '../errors/application-error';

import type { Command } from '../message';
import type { CommandHandler } from './command-bus';
import type { CorrelationId } from '@relcko/types';

class TestDomainError extends Error {
  readonly code = 'TEST_CODE';
}

interface TestPayload {
  readonly value: number;
}

const mockCommand = <TPayload>(type: string, payload: TPayload, correlationId: string): Command<TPayload> => ({
  type,
  payload,
  metadata: { messageId: crypto.randomUUID(), correlationId: correlationId as CorrelationId, timestamp: Date.now() },
});

describe('InMemoryCommandBus', () => {
  it('dispatches a command to its handler', async () => {
    const bus = new InMemoryCommandBus();
    const handler: CommandHandler<Command<TestPayload>, string> = {
      commandType: 'test-command',
      handle(cmd) {
        return Promise.resolve(`result-${cmd.payload.value}`);
      },
    };
    bus.register(handler);
    const result = await bus.dispatch<string>(mockCommand('test-command', { value: 42 }, crypto.randomUUID()));
    expect(result).toBe('result-42');
  });

  it('rejects unknown commands', async () => {
    const bus = new InMemoryCommandBus();
    await expect(bus.dispatch(mockCommand('unknown', {}, crypto.randomUUID()))).rejects.toThrow(UnknownCommandError);
  });

  it('prevents duplicate handler registration', () => {
    const bus = new InMemoryCommandBus();
    const handler: CommandHandler = { commandType: 'dup', handle() { return Promise.resolve(); } };
    bus.register(handler);
    const dup: CommandHandler = { commandType: 'dup', handle() { return Promise.resolve(); } };
    expect(() => { bus.register(dup); }).toThrow(DuplicateHandlerError);
  });

  it('checks handler existence', () => {
    const bus = new InMemoryCommandBus();
    expect(bus.hasHandler('test')).toBe(false);
    bus.register({ commandType: 'test', handle() { return Promise.resolve(); } });
    expect(bus.hasHandler('test')).toBe(true);
  });

  it('wraps handler errors in HandlerExecutionFailedError', async () => {
    const bus = new InMemoryCommandBus();
    bus.register({
      commandType: 'fail',
      handle() {
        return Promise.reject(new Error('handler crashed'));
      },
    });
    await expect(bus.dispatch(mockCommand('fail', {}, crypto.randomUUID()))).rejects.toThrow(HandlerExecutionFailedError);
  });

  it('preserves non-DomainError instances as HandlerExecutionFailedError', async () => {
    const bus = new InMemoryCommandBus();
    bus.register({
      commandType: 'domain-fail',
      handle() {
        return Promise.reject(new TestDomainError('domain-specific'));
      },
    });
    const dispatch = bus.dispatch(mockCommand('domain-fail', {}, crypto.randomUUID()));
    await expect(dispatch).rejects.toThrow(HandlerExecutionFailedError);
  });

  it('preserves the original error as cause', async () => {
    const bus = new InMemoryCommandBus();
    const original = new Error('root cause');
    bus.register({
      commandType: 'cause-test',
      handle() {
        return Promise.reject(original);
      },
    });
    try {
      await bus.dispatch(mockCommand('cause-test', {}, crypto.randomUUID()));
    } catch (error) {
      expect(error).toBeInstanceOf(HandlerExecutionFailedError);
      expect((error as Error).cause).toBe(original);
    }
  });

  it('supports multiple handlers for different commands', async () => {
    const bus = new InMemoryCommandBus();
    bus.register({ commandType: 'cmd-a', handle() { return Promise.resolve('a'); } });
    bus.register({ commandType: 'cmd-b', handle() { return Promise.resolve('b'); } });
    await expect(bus.dispatch<string>(mockCommand('cmd-a', {}, crypto.randomUUID()))).resolves.toBe('a');
    await expect(bus.dispatch<string>(mockCommand('cmd-b', {}, crypto.randomUUID()))).resolves.toBe('b');
  });
});
