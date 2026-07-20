import type { DomainEvent } from './domain-event';
import type { EventEnvelope } from '@relcko/events';
import type { CorrelationId, EventId } from '@relcko/types';

export interface ToEventEnvelopeOptions {
  readonly causationId?: EventId;
  readonly producer?: string;
}

export function toEventEnvelope<TPayload>(
  domainEvent: DomainEvent,
  payload: TPayload,
  correlationId: CorrelationId,
  producer: string,
  options?: ToEventEnvelopeOptions,
): EventEnvelope<TPayload> {
  return {
    metadata: {
      eventId: domainEvent.eventId,
      eventType: domainEvent.eventType,
      eventVersion: domainEvent.schemaVersion,
      aggregateId: domainEvent.aggregateId,
      aggregateType: domainEvent.aggregateType,
      aggregateVersion: domainEvent.aggregateVersion,
      correlationId,
      causationId: options?.causationId,
      timestamp: domainEvent.occurredAt.getTime(),
      producer: options?.producer ?? producer,
    },
    payload,
  };
}
