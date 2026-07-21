import type { CorrelationId, SpanId, TraceId } from './index';

export interface OperationContext {
  readonly correlationId: CorrelationId;
  readonly traceId?: TraceId;
  readonly spanId?: SpanId;
  readonly actorId?: string;
}

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function success<T, E = Error>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function failure<T, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}
