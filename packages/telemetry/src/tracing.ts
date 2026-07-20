import { AsyncLocalStorage } from 'node:async_hooks';

import type { SpanId, TraceId } from '@relcko/types';

/** Terminal status of a finished span. */
export type SpanStatus = 'ok' | 'error';

/** Value types allowed as span attributes. */
export type SpanAttributeValue = string | number | boolean;

/**
 * Identity of a span within a distributed trace.
 */
export interface SpanContext {
  /** Identifier of the whole trace. */
  readonly traceId: TraceId;
  /** Identifier of this span. */
  readonly spanId: SpanId;
  /** Identifier of the parent span, when any. */
  readonly parentSpanId?: SpanId;
}

/** A timestamped event attached to a span. */
export interface SpanEvent {
  /** Event name. */
  readonly name: string;
  /** Epoch milliseconds when the event was recorded. */
  readonly timestamp: number;
  /** Optional event attributes. */
  readonly attributes?: Record<string, SpanAttributeValue>;
}

/**
 * A single unit of work within a trace.
 */
export interface Span {
  /** Span name (operation). */
  readonly name: string;
  /** Identity of this span. */
  readonly context: SpanContext;
  /** True after {@link Span.end} has been called. */
  readonly ended: boolean;

  /**
   * Attaches an attribute to the span.
   *
   * @param key - attribute key
   * @param value - attribute value
   */
  setAttribute(key: string, value: SpanAttributeValue): void;

  /**
   * Records a timestamped event on the span.
   *
   * @param name - event name
   * @param attributes - optional event attributes
   */
  addEvent(name: string, attributes?: Record<string, SpanAttributeValue>): void;

  /**
   * Records an exception and marks the span as failed.
   *
   * @param error - exception to record
   */
  recordException(error: Error): void;

  /**
   * Sets the terminal span status.
   *
   * @param status - 'ok' or 'error'
   */
  setStatus(status: SpanStatus): void;

  /** Ends the span. Subsequent mutations are ignored. */
  end(): void;
}

/** Options accepted when starting a span. */
export interface StartSpanOptions {
  /** Explicit parent context. Defaults to the currently active span. */
  readonly parent?: SpanContext;
  /** Initial span attributes. */
  readonly attributes?: Record<string, SpanAttributeValue>;
}

/**
 * Tracer creates spans and propagates the active span across async flows.
 */
export interface Tracer {
  /**
   * Starts a new span. The caller is responsible for ending it.
   *
   * @param name - operation name
   * @param options - span options
   * @returns the started span
   */
  startSpan(name: string, options?: StartSpanOptions): Span;

  /**
   * Runs fn with a new active span, ending it automatically. Exceptions are
   * recorded on the span and rethrown.
   *
   * @typeParam T - return type of the wrapped function
   * @param name - operation name
   * @param fn - function to execute within the span
   * @returns the result of fn
   * @throws rethrows the original error after recording it
   */
  withSpan<T>(name: string, fn: (span: Span) => T): T;
}

/** Immutable record of a finished span. */
export interface FinishedSpan {
  /** Span name. */
  readonly name: string;
  /** Span identity. */
  readonly context: SpanContext;
  /** Span attributes. */
  readonly attributes: Record<string, SpanAttributeValue>;
  /** Recorded span events. */
  readonly events: readonly SpanEvent[];
  /** Terminal status. */
  readonly status: SpanStatus;
  /** Start time in epoch milliseconds. */
  readonly startedAt: number;
  /** End time in epoch milliseconds. */
  readonly endedAt: number;
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

class InMemorySpan implements Span {
  readonly context: SpanContext;
  private readonly attributes: Record<string, SpanAttributeValue> = {};
  private readonly events: SpanEvent[] = [];
  private readonly startedAt: number;
  private status: SpanStatus = 'ok';
  private endedAt: number | undefined;

  constructor(
    readonly name: string,
    context: SpanContext,
    attributes?: Record<string, SpanAttributeValue>,
    private readonly onEnd?: (span: FinishedSpan) => void,
  ) {
    this.context = context;
    this.startedAt = Date.now();
    if (attributes !== undefined) {
      Object.assign(this.attributes, attributes);
    }
  }

  get ended(): boolean {
    return this.endedAt !== undefined;
  }

  setAttribute(key: string, value: SpanAttributeValue): void {
    if (this.ended) {
      return;
    }
    this.attributes[key] = value;
  }

  addEvent(name: string, attributes?: Record<string, SpanAttributeValue>): void {
    if (this.ended) {
      return;
    }
    this.events.push(attributes === undefined ? { name, timestamp: Date.now() } : { name, timestamp: Date.now(), attributes });
  }

  recordException(error: Error): void {
    if (this.ended) {
      return;
    }
    this.addEvent('exception', { 'exception.message': error.message, 'exception.type': error.name });
    this.setStatus('error');
  }

  setStatus(status: SpanStatus): void {
    if (this.ended) {
      return;
    }
    this.status = status;
  }

  end(): void {
    if (this.ended) {
      return;
    }
    this.endedAt = Date.now();
    const finished: FinishedSpan = {
      name: this.name,
      context: this.context,
      attributes: { ...this.attributes },
      events: [...this.events],
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationMs: this.endedAt - this.startedAt,
    };
    this.onEnd?.(finished);
  }
}

function generateTraceId(): TraceId {
  return crypto.randomUUID() as TraceId;
}

function generateSpanId(): SpanId {
  return crypto.randomUUID() as SpanId;
}

/**
 * Dependency-free {@link Tracer} recording finished spans in memory and
 * propagating the active span via async-local storage.
 */
export class InMemoryTracer implements Tracer {
  private readonly active = new AsyncLocalStorage<Span>();
  private readonly finished: FinishedSpan[] = [];

  startSpan(name: string, options?: StartSpanOptions): Span {
    const parent = options?.parent ?? this.active.getStore()?.context;
    const context: SpanContext = {
      traceId: parent?.traceId ?? generateTraceId(),
      spanId: generateSpanId(),
      ...(parent !== undefined ? { parentSpanId: parent.spanId } : {}),
    };
    return new InMemorySpan(name, context, options?.attributes, (span) => {
      this.finished.push(span);
    });
  }

  withSpan<T>(name: string, fn: (span: Span) => T): T {
    const span = this.startSpan(name);
    return this.active.run(span, () => {
      try {
        const result = fn(span);
        span.end();
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.end();
        throw error instanceof Error ? error : new Error(String(error));
      }
    });
  }

  /**
   * Returns all finished spans in completion order.
   *
   * @returns copy of the finished span list
   */
  finishedSpans(): readonly FinishedSpan[] {
    return [...this.finished];
  }
}

class NoOpSpan implements Span {
  readonly context: SpanContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
  };

  constructor(readonly name: string) {}

  readonly ended = true;

  setAttribute(_key: string, _value: SpanAttributeValue): void {}
  addEvent(_name: string, _attributes?: Record<string, SpanAttributeValue>): void {}
  recordException(_error: Error): void {}
  setStatus(_status: SpanStatus): void {}
  end(): void {}
}

/**
 * {@link Tracer} that discards every span. Useful when tracing is disabled
 * by configuration.
 */
export class NoOpTracer implements Tracer {
  startSpan(name: string, _options?: StartSpanOptions): Span {
    return new NoOpSpan(name);
  }

  withSpan<T>(name: string, fn: (span: Span) => T): T {
    return fn(new NoOpSpan(name));
  }
}
