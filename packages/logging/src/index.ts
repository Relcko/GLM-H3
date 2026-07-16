export enum LogLevel {
  Trace = "trace",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Fatal = "fatal",
}

const ORDER: Record<LogLevel, number> = {
  [LogLevel.Trace]: 0,
  [LogLevel.Debug]: 1,
  [LogLevel.Info]: 2,
  [LogLevel.Warn]: 3,
  [LogLevel.Error]: 4,
  [LogLevel.Fatal]: 5,
};

export interface LogEntry {
  readonly level: LogLevel;
  readonly time: string;
  readonly message: string;
  readonly scope?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly error?: { readonly name: string; readonly message: string; readonly stack?: string };
}

export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  readonly level: LogLevel;
  trace(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>, error?: Error): void;
  fatal(message: string, metadata?: Record<string, unknown>, error?: Error): void;
  child(scope: string, metadata?: Record<string, unknown>): Logger;
}

export const consoleSink: LogSink = (entry) => {
  const line = JSON.stringify({
    ...entry,
    level: entry.level.toUpperCase(),
  });
  if (entry.level === LogLevel.Error || entry.level === LogLevel.Fatal) {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
};

export interface LoggerOptions {
  readonly minLevel?: LogLevel;
  readonly sink?: LogSink;
  readonly scope?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly defaultMetadata?: Readonly<Record<string, unknown>>;
}

export class ConsoleLogger implements Logger {
  readonly level: LogLevel;
  private readonly sink: LogSink;
  private readonly scope?: string;
  private readonly correlationId?: string;
  private readonly traceId?: string;
  private readonly defaultMetadata?: Readonly<Record<string, unknown>>;

  constructor(options: LoggerOptions = {}) {
    this.level = options.minLevel ?? LogLevel.Info;
    this.sink = options.sink ?? consoleSink;
    this.scope = options.scope;
    this.correlationId = options.correlationId;
    this.traceId = options.traceId;
    this.defaultMetadata = options.defaultMetadata;
  }

  private emit(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (ORDER[level] < ORDER[this.level]) return;
    this.sink({
      level,
      time: new Date().toISOString(),
      message,
      scope: this.scope,
      correlationId: this.correlationId,
      traceId: this.traceId,
      metadata: { ...this.defaultMetadata, ...metadata },
      error: error
        ? { name: error.name, message: error.message, stack: error.stack }
        : undefined,
    });
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.emit(LogLevel.Trace, message, metadata);
  }
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.emit(LogLevel.Debug, message, metadata);
  }
  info(message: string, metadata?: Record<string, unknown>): void {
    this.emit(LogLevel.Info, message, metadata);
  }
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.emit(LogLevel.Warn, message, metadata);
  }
  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    this.emit(LogLevel.Error, message, metadata, error);
  }
  fatal(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    this.emit(LogLevel.Fatal, message, metadata, error);
  }

  child(scope: string, metadata?: Record<string, unknown>): Logger {
    return new ConsoleLogger({
      minLevel: this.level,
      sink: this.sink,
      scope: this.scope ? `${this.scope}.${scope}` : scope,
      correlationId: this.correlationId,
      traceId: this.traceId,
      defaultMetadata: { ...this.defaultMetadata, ...metadata },
    });
  }
}

export function createLogger(options?: LoggerOptions): Logger {
  return new ConsoleLogger(options);
}
