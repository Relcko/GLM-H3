import { generateTraceId } from "@relcko/utils";

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  end(metadata?: Record<string, unknown>): void;
}

export interface Tracer {
  startSpan(name: string, parentTraceId?: string): Span;
}

class NoopSpan implements Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  constructor(name: string, traceId?: string) {
    this.name = name;
    this.traceId = traceId ?? "no-trace";
    this.spanId = "no-span";
  }
  end(): void {}
}

/** No-op tracer — safe default before a real APM is attached. */
export class NoopTracer implements Tracer {
  startSpan(name: string, parentTraceId?: string): Span {
    return new NoopSpan(name, parentTraceId ?? generateTraceId());
  }
}

export function createNoopTracer(): Tracer {
  return new NoopTracer();
}
