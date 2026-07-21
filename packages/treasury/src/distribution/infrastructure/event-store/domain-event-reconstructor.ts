import { DomainEvent } from "@relcko/kernel";
import type { DomainEventProps } from "@relcko/kernel";
import type { StoredEvent } from "@relcko/event-store";
import { parseWithBigint } from "../services/bigint-json";

export class ReconstitutedDomainEvent extends DomainEvent {
  public readonly eventType: string;
  public readonly data: Record<string, unknown>;

  constructor(
    eventType: string,
    data: Record<string, unknown>,
    props: DomainEventProps,
  ) {
    super(props);
    this.eventType = eventType;
    this.data = data;
  }
}

export function reconstructDomainEvent(
  storedEvent: StoredEvent,
): DomainEvent {
  const data = parseWithBigint(storedEvent.data) as Record<string, unknown>;
  const metadata = parseWithBigint(storedEvent.metadata) as {
    aggregateId?: string;
    aggregateType?: string;
  };
  const aggregateId = metadata.aggregateId ?? storedEvent.streamId;
  const aggregateType = metadata.aggregateType ?? "unknown";
  const props: DomainEventProps = {
    eventId: storedEvent.eventId,
    aggregateId,
    aggregateType,
    aggregateVersion: storedEvent.version,
    occurredAt: new Date(storedEvent.recordedAt),
    schemaVersion: storedEvent.eventVersion,
  };
  return new ReconstitutedDomainEvent(storedEvent.eventType, data, props);
}

export function reconstructDomainEvents(
  storedEvents: readonly StoredEvent[],
): DomainEvent[] {
  return storedEvents.map(reconstructDomainEvent);
}
