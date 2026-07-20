import type { EventId, CorrelationId, Timestamp } from '@relcko/types';

export interface EventMetadata {
  readonly eventId: EventId;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly aggregateVersion: number;
  readonly correlationId: CorrelationId;
  readonly causationId?: EventId;
  readonly timestamp: Timestamp;
  readonly producer: string;
}

export interface EventEnvelope<TPayload = unknown> {
  readonly metadata: EventMetadata;
  readonly payload: TPayload;
}

export function createEnvelope<TPayload>(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: TPayload,
  correlationId: CorrelationId,
  options?: {
    eventVersion?: number;
    causationId?: EventId;
    producer?: string;
  },
): EventEnvelope<TPayload> {
  return {
    metadata: {
      eventId: crypto.randomUUID() as EventId,
      eventType,
      eventVersion: options?.eventVersion ?? 1,
      aggregateId,
      aggregateType,
      aggregateVersion: 0,
      correlationId,
      causationId: options?.causationId,
      timestamp: Date.now(),
      producer: options?.producer ?? 'unknown',
    },
    payload,
  };
}
