import type { AggregateRoot, DomainEvent } from "@relcko/kernel";
import { toEventEnvelope } from "@relcko/kernel";
import { EventSerializationError } from "@relcko/event-store";
import type { EventStore, AppendOptions, StoredEvent } from "@relcko/event-store";
import { streamIdFor, EMPTY_STREAM_VERSION } from "@relcko/event-store";
import type { StreamId } from "@relcko/event-store";
import type { EventEnvelope } from "@relcko/events";
import { reconstructDomainEvents } from "./domain-event-reconstructor";

export abstract class BaseEventStoreRepository<TAggregate extends AggregateRoot<TId>, TId> {
  protected abstract readonly aggregateTypeName: string;

  constructor(
    protected readonly eventStore: EventStore,
  ) {}

  protected streamId(id: TId): StreamId {
    return streamIdFor(this.aggregateTypeName, String(id));
  }

  protected async loadEvents(aggregateId: TId): Promise<readonly StoredEvent[]> {
    const stream = await this.eventStore.load(this.streamId(aggregateId));
    if (stream.version === EMPTY_STREAM_VERSION) {
      return [];
    }
    return stream.events;
  }

  protected abstract createAggregate(id: TId, history: readonly DomainEvent[]): TAggregate;

  protected async buildAggregate(id: TId): Promise<TAggregate | null> {
    const events = await this.loadEvents(id);
    if (events.length === 0) return null;
    const domainEvents = reconstructDomainEvents(events);
    return this.createAggregate(id, domainEvents);
  }

  protected async appendEvents(
    aggregate: TAggregate,
    expectedVersion: number,
    ensureEventId?: (envelope: EventEnvelope) => EventEnvelope,
  ): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    if (uncommittedEvents.length === 0) return;

    const envelopes: EventEnvelope[] = uncommittedEvents.map((event) => {
      const envelope = toEventEnvelope(
        event as unknown as DomainEvent,
        (event as unknown as { data: Record<string, unknown> }).data ?? {},
        String(aggregate.id),
        this.aggregateTypeName,
        { producer: `treasury.${this.aggregateTypeName}` },
      );
      return ensureEventId ? ensureEventId(envelope) : envelope;
    });

    try {
      await this.eventStore.append(this.streamId(aggregate.id as unknown as TId), envelopes, {
        expectedVersion,
      } as AppendOptions);
    } catch (error) {
      throw error;
    }

    aggregate.markEventsAsCommitted();
  }
}
