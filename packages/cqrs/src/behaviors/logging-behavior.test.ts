import { describe, expect, it } from 'vitest';

import { LoggingBehavior } from './logging-behavior';

import type { MessageContext } from '../pipeline';
import type { Logger } from '@relcko/logger';
import type { CorrelationId } from '@relcko/types';

interface LogRecord {
  readonly level: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

class RecordingLogger implements Logger {
  readonly records: LogRecord[] = [];

  debug(message: string, context?: Record<string, unknown>): void {
    this.records.push({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.records.push({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.records.push({ level: 'warn', message, context });
  }

  error(message: string, _error?: Error, context?: Record<string, unknown>): void {
    this.records.push({ level: 'error', message, context });
  }

  child(_service: string): Logger {
    return this;
  }
}

const context: MessageContext = {
  kind: 'query',
  messageType: 'GetOrder',
  metadata: {
    messageId: 'msg-9',
    correlationId: 'corr-9' as CorrelationId,
    timestamp: 1,
  },
};

describe('LoggingBehavior', () => {
  it('should_log_start_and_success_with_correlation_context', async () => {
    const logger = new RecordingLogger();
    const behavior = new LoggingBehavior(logger);

    const result = await behavior.handle({}, context, () => Promise.resolve('done'));

    expect(result).toBe('done');
    expect(logger.records.map((record) => record.message)).toEqual([
      'Handling message',
      'Message handled',
    ]);
    expect(logger.records[0]?.context).toMatchObject({
      kind: 'query',
      messageType: 'GetOrder',
      correlationId: 'corr-9',
    });
  });

  it('should_log_failures_and_rethrow', async () => {
    const logger = new RecordingLogger();
    const behavior = new LoggingBehavior(logger);
    const failure = new Error('db down');

    await expect(
      behavior.handle({}, context, () => Promise.reject(failure)),
    ).rejects.toBe(failure);

    const errors = logger.records.filter((record) => record.level === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('Message failed');
  });
});
