import { z } from "zod";
import type {
  CorrelationId,
  EntityId,
  EventId,
  IdempotencyKey,
  Metadata,
  TraceId,
  Version,
} from "@relcko/types";
import { asCorrelationId, asEventId, asIdempotencyKey, asTraceId, asVersion } from "@relcko/types";
import { ValidationError } from "@relcko/error";
import type { Json } from "@relcko/types";
import type { RelckoEventEnvelope, RetryMetadata } from "./envelope";

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(jsonSchema),
  ]),
);

export const retryMetadataSchema = z.object({
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lastError: z.string().optional(),
  nextRetryAt: z.string().datetime().optional(),
});

export const envelopeSchema = z.object({
  eventId: z.string().min(1),
  type: z.string().min(1),
  aggregateId: z.string().min(1),
  occurredAt: z.string().datetime(),
  actorId: z.string().min(1),
  version: z.number().int().positive(),
  correlationId: z.string().min(1),
  traceId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  payload: jsonSchema,
  metadata: z.record(jsonSchema).optional(),
  retry: retryMetadataSchema.optional(),
  deadLettered: z.boolean().optional(),
  source: z.string().optional(),
});

/** Validate an envelope, coercing branded types. Throws ValidationError on failure. */
export function validateEnvelope<P extends Json>(envelope: unknown): RelckoEventEnvelope<P> {
  const result = envelopeSchema.safeParse(envelope);
  if (!result.success) {
    throw new ValidationError(
      "Invalid event envelope",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      "EVENT_ENVELOPE_INVALID",
    );
  }
  const v = result.data;
  return {
    eventId: asEventId(v.eventId),
    type: v.type,
    aggregateId: v.aggregateId as EntityId,
    occurredAt: v.occurredAt,
    actorId: v.actorId as EntityId,
    version: asVersion(v.version),
    correlationId: asCorrelationId(v.correlationId),
    traceId: asTraceId(v.traceId),
    idempotencyKey: asIdempotencyKey(v.idempotencyKey),
    payload: v.payload as P,
    metadata: v.metadata as Metadata | undefined,
    retry: v.retry as RetryMetadata | undefined,
    deadLettered: v.deadLettered,
    source: v.source,
  };
}
