export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly distributionId?: string;
  readonly sagaId?: string;
  readonly paymentId?: string;
  readonly recipientId?: string;
  readonly userId?: string;
  readonly source?: string;
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context: LogContext;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  /\b(?:[A-Za-z0-9+/]{4}){2,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/g,
  /\b(?:stl:|sk-|pk-|secret)\w{10,}\b/g,
];

export class OperationLogger {
  private readonly _context: LogContext;
  private static _globalLevel: LogLevel = "info";
  private static _instanceCount = 0;
  private readonly _id: number;

  constructor(initialContext?: LogContext) {
    this._context = { ...initialContext };
    this._id = ++OperationLogger._instanceCount;
  }

  static setGlobalLevel(level: LogLevel): void {
    OperationLogger._globalLevel = level;
  }

  static get globalLevel(): LogLevel {
    return OperationLogger._globalLevel;
  }

  child(additionalContext: LogContext): OperationLogger {
    return new OperationLogger({ ...this._context, ...additionalContext });
  }

  withCorrelationId(correlationId: string): OperationLogger {
    return this.child({ correlationId });
  }

  withRequestId(requestId: string): OperationLogger {
    return this.child({ requestId });
  }

  withDistributionId(distributionId: string): OperationLogger {
    return this.child({ distributionId });
  }

  withSagaId(sagaId: string): OperationLogger {
    return this.child({ sagaId });
  }

  withPaymentId(paymentId: string): OperationLogger {
    return this.child({ paymentId });
  }

  get context(): Readonly<LogContext> {
    return { ...this._context };
  }

  debug(message: string, extra?: LogContext): void {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: LogContext): void {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: LogContext): void {
    this.log("warn", message, extra);
  }

  error(message: string, errorOrExtra?: Error | LogContext, extra?: LogContext): void {
    if (errorOrExtra instanceof Error) {
      this.log("error", message, { ...extra, error: this.serializeError(errorOrExtra) });
    } else {
      this.log("error", message, errorOrExtra);
    }
  }

  fatal(message: string, errorOrExtra?: Error | LogContext, extra?: LogContext): void {
    if (errorOrExtra instanceof Error) {
      this.log("fatal", message, { ...extra, error: this.serializeError(errorOrExtra) });
    } else {
      this.log("fatal", message, errorOrExtra);
    }
  }

  private log(level: LogLevel, message: string, extra?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const merged: LogContext = { ...this._context, ...extra };
    const masked = this.maskSensitive(merged);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: masked,
    };

    if (masked.error) {
      entry.error = masked.error as LogEntry["error"];
      delete masked.error;
    }

    const output = JSON.stringify(entry);
    switch (level) {
      case "debug":
      case "info":
        console.log(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
      case "fatal":
        console.error(output);
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const order: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
    return order.indexOf(level) >= order.indexOf(OperationLogger._globalLevel);
  }

  private maskSensitive(context: LogContext): LogContext {
    const masked: LogContext = { ...context };
    for (const key of Object.keys(masked)) {
      if (typeof masked[key] === "string") {
        let value = masked[key] as string;
        for (const pattern of SENSITIVE_PATTERNS) {
          value = value.replace(pattern, "***");
        }
        masked[key] = value;
      }
    }
    return masked;
  }

  private serializeError(error: Error): { name: string; message: string; stack?: string } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}

export const defaultLogger = new OperationLogger({ source: "distribution" });
