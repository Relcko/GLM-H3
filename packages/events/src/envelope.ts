import type {
  CorrelationId,
  EntityId,
  EventId,
  IdempotencyKey,
  Json,
  Metadata,
  Timestamp,
  TraceId,
  Version,
} from "@relcko/types";
import { asCorrelationId, asEventId, asIdempotencyKey, asTraceId, asVersion } from "@relcko/types";
import { generateCorrelationId, generateEventId, generateTraceId } from "@relcko/utils";

/** Retry metadata attached to events that failed first delivery. */
export interface RetryMetadata {
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly lastError?: string;
  readonly nextRetryAt?: Timestamp;
}

/**
 * Canonical event envelope (EVENT_ARCHITECTURE.md §1). The only module-specific
 * part is `payload`. Everything else is framework-controlled metadata enabling
 * strong typing, versioning, correlation, tracing, idempotency and retries.
 */
export interface RelckoEventEnvelope<P extends Json = Json> {
  readonly eventId: EventId;
  readonly type: string;
  readonly aggregateId: EntityId;
  readonly occurredAt: Timestamp;
  readonly actorId: EntityId;
  readonly version: Version;
  readonly correlationId: CorrelationId;
  readonly traceId: TraceId;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: P;
  readonly metadata?: Metadata;
  readonly retry?: RetryMetadata;
  readonly deadLettered?: boolean;
  readonly source?: string;
}

export interface CreateEnvelopeInput<P extends Json> {
  type: string;
  aggregateId: EntityId;
  actorId: EntityId;
  payload: P;
  version?: number;
  correlationId?: string;
  traceId?: string;
  idempotencyKey?: string;
  metadata?: Metadata;
  source?: string;
  occurredAt?: Timestamp;
}

/** Build a fully-populated envelope with generated ids where not supplied. */
export function createEnvelope<P extends Json>(input: CreateEnvelopeInput<P>): RelckoEventEnvelope<P> {
  return {
    eventId: asEventId(generateEventId()),
    type: input.type,
    aggregateId: input.aggregateId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    actorId: input.actorId,
    version: asVersion(input.version ?? 1),
    correlationId: asCorrelationId(input.correlationId ?? generateCorrelationId()),
    traceId: asTraceId(input.traceId ?? generateTraceId()),
    idempotencyKey: asIdempotencyKey(input.idempotencyKey ?? generateEventId()),
    payload: stripUndefined(input.payload),
    metadata: input.metadata,
    source: input.source,
  };
}

/** Attach / increment retry metadata (immutably) for a failed delivery. */
export function withRetry<P extends Json>(
  envelope: RelckoEventEnvelope<P>,
  error: string,
  maxAttempts: number,
): RelckoEventEnvelope<P> {
  const attempts = (envelope.retry?.attempts ?? 0) + 1;
  return {
    ...envelope,
    retry: { attempts, maxAttempts, lastError: error, nextRetryAt: new Date().toISOString() },
  };
}

/** Mark an event as dead-lettered (immutably). */
export function markDeadLetter<P extends Json>(envelope: RelckoEventEnvelope<P>): RelckoEventEnvelope<P> {
  return { ...envelope, deadLettered: true };
}

/**
 * Remove `undefined` values from a JSON payload so generated envelopes always
 * satisfy the canonical envelope schema (zod `z.record(jsonSchema)` rejects
 * `undefined` values). Keys with `undefined` are simply omitted — this is a
 * serialization concern only and never alters domain meaning.
 */
function stripUndefined<P extends Json>(payload: P): P {
  if (payload === null || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) {
    return payload.map((v) => stripUndefined(v as never)) as unknown as P;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value !== undefined) out[key] = stripUndefined(value as never);
  }
  return out as unknown as P;
}
