import type { CorrelationId } from '@relcko/types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly service?: string;
  readonly correlationId?: CorrelationId;
  readonly error?: {
    readonly message: string;
    readonly code?: string;
    readonly stack?: string;
  };
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  child(service: string): Logger;
}

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class ConsoleLogger implements Logger {
  private readonly minLevel: number;
  private readonly serviceName: string;

  constructor(serviceName?: string, minLevel?: LogLevel) {
    this.minLevel = minLevel ? LEVELS[minLevel] : LEVELS.debug;
    this.serviceName = serviceName ?? 'relcko';
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= this.minLevel;
  }

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...context,
    };
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const output = JSON.stringify(entry);
    process.stdout.write(output + '\n');
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write(this.formatEntry('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write(this.formatEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write(this.formatEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.write(
      this.formatEntry('error', message, {
        ...context,
        error: error
          ? {
              message: error.message,
              code: (error as { code?: string }).code,
              stack: error.stack,
            }
          : undefined,
      }),
    );
  }

  child(service: string): Logger {
    return new ConsoleLogger(service);
  }
}

export class NoOpLogger implements Logger {
  debug(_message: string, _context?: Record<string, unknown>): void {}
  info(_message: string, _context?: Record<string, unknown>): void {}
  warn(_message: string, _context?: Record<string, unknown>): void {}
  error(_message: string, _error?: Error, _context?: Record<string, unknown>): void {}
  child(_service: string): Logger {
    return this;
  }
}
