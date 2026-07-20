import { EXPECTED_VERSION_ANY, OptimisticConcurrencyError } from '@relcko/event-store';
import { systemClock } from '@relcko/kernel';

import type {
  AppendOptions,
  AppendResult,
  EventDeserializer,
  EventSerializer,
  EventStore,
  EventStream,
  SerializedEvent,
  Snapshot,
  SnapshotStore,
  StoredEvent,
  StreamId,
  StreamOptions,
} from '@relcko/event-store';
import type { EventEnvelope, EventMetadata } from '@relcko/events';
import type { Clock } from '@relcko/kernel';

/**
 * JSON {@link EventSerializer} / {@link EventDeserializer} pair for tests.
 * Payload and metadata round-trip through JSON serialization.
 */
export class JsonEventSerializer implements EventSerializer, EventDeserializer {
  serialize(envelope: EventEnvelope): SerializedEvent {
    return {
      eventType: envelope.metadata.eventType,
      eventVersion: envelope.metadata.eventVersion,
      data: JSON.stringify(envelope.payload),
      metadata: JSON.stringify(envelope.metadata),
    };
  }

  deserialize(event: SerializedEvent): EventEnvelope {
    return {
      metadata: JSON.parse(event.metadata) as EventMetadata,
      payload: JSON.parse(event.data) as unknown,
    };
  }
}

/**
 * Testing-grade in-memory {@link EventStore} and {@link SnapshotStore}.
 *
 * Honors the full store contract: gapless per-stream versions, gapless
 * global positions, optimistic concurrency, bounded streaming, and snapshot
 * replacement semantics. Use it for integration, replay, and projection
 * tests (Playbook 9.3, 9.5). Production database implementations are
 * delivered by infrastructure packages.
 */
export class InMemoryEventStore implements EventStore, SnapshotStore {
  private readonly streams = new Map<StreamId, StoredEvent[]>();
  private readonly snapshots = new Map<StreamId, Snapshot[]>();
  private globalPosition = 0;
  private readonly serializer: EventSerializer;
  private readonly clock: Clock;

  /**
   * @param serializer - envelope serializer; defaults to {@link JsonEventSerializer}
   * @param clock - clock for recordedAt timestamps; defaults to the system clock
   */
  constructor(serializer?: EventSerializer, clock?: Clock) {
    this.serializer = serializer ?? new JsonEventSerializer();
    this.clock = clock ?? systemClock;
  }

  append(
    streamId: StreamId,
    events: readonly EventEnvelope[],
    options: AppendOptions,
  ): Promise<AppendResult> {
    const existing = this.streams.get(streamId) ?? [];
    if (
      options.expectedVersion !== EXPECTED_VERSION_ANY &&
      options.expectedVersion !== existing.length
    ) {
      return Promise.reject(
        new OptimisticConcurrencyError(streamId, options.expectedVersion, existing.length),
      );
    }
    const appended: StoredEvent[] = events.map((envelope, index) => {
      this.globalPosition += 1;
      const serialized = this.serializer.serialize(envelope);
      return {
        eventId: envelope.metadata.eventId,
        streamId,
        version: existing.length + index + 1,
        globalPosition: this.globalPosition,
        eventType: serialized.eventType,
        eventVersion: serialized.eventVersion,
        data: serialized.data,
        metadata: serialized.metadata,
        recordedAt: this.clock.nowMs(),
      };
    });
    this.streams.set(streamId, [...existing, ...appended]);
    return Promise.resolve({
      streamId,
      version: existing.length + appended.length,
      appendedCount: appended.length,
    });
  }

  load(streamId: StreamId): Promise<EventStream> {
    const events = this.streams.get(streamId) ?? [];
    return Promise.resolve({ streamId, version: events.length, events: [...events] });
  }

  loadFromVersion(streamId: StreamId, fromVersion: number): Promise<EventStream> {
    const all = this.streams.get(streamId) ?? [];
    return Promise.resolve({
      streamId,
      version: all.length,
      events: all.filter((event) => event.version >= fromVersion),
    });
  }

  async *stream(options?: StreamOptions): AsyncIterable<StoredEvent> {
    const all = [...this.streams.values()]
      .flat()
      .sort((left, right) => left.globalPosition - right.globalPosition);
    for (const event of all) {
      if (options?.fromPosition !== undefined && event.globalPosition <= options.fromPosition) {
        continue;
      }
      if (options?.toPosition !== undefined && event.globalPosition > options.toPosition) {
        continue;
      }
      yield await Promise.resolve(event);
    }
  }

  snapshot(snapshot: Snapshot): Promise<void> {
    const existing = (this.snapshots.get(snapshot.streamId) ?? []).filter(
      (candidate) => candidate.version !== snapshot.version,
    );
    this.snapshots.set(snapshot.streamId, [...existing, snapshot]);
    return Promise.resolve();
  }

  loadLatest(streamId: StreamId): Promise<Snapshot | null> {
    const candidates = this.snapshots.get(streamId) ?? [];
    const latest = [...candidates].sort((left, right) => right.version - left.version)[0] ?? null;
    return Promise.resolve(latest);
  }

  loadAtVersion(streamId: StreamId, version: number): Promise<Snapshot | null> {
    const candidates = (this.snapshots.get(streamId) ?? []).filter(
      (snapshot) => snapshot.version <= version,
    );
    const latest = [...candidates].sort((left, right) => right.version - left.version)[0] ?? null;
    return Promise.resolve(latest);
  }

  /** Removes every stream and snapshot. */
  clear(): void {
    this.streams.clear();
    this.snapshots.clear();
    this.globalPosition = 0;
  }
}
