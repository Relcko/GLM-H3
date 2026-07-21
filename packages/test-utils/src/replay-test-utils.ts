import { asStreamId } from '@relcko/event-store';

import type { AppendResult, EventStore, EventStream, StreamOptions } from '@relcko/event-store';
import type { StoredEvent } from '@relcko/event-store';
import type { ReplayEventSink } from '@relcko/replay';
import type { EventId } from '@relcko/types';

/** Specification for building a {@link StoredEvent} in tests. */
export interface StoredEventSpec {
  /** Global position (also used as the per-stream version). */
  readonly position: number;
  /** Stream identifier. Defaults to 'TestStream-test'. */
  readonly streamId?: string;
  /** Event type. Defaults to `TestEvent{position}`. */
  readonly eventType?: string;
  /** Serialized payload. Defaults to '{}'. */
  readonly data?: string;
  /** Serialized metadata. Defaults to '{}'. */
  readonly metadata?: string;
  /** Event schema version. Defaults to 1. */
  readonly eventVersion?: number;
  /** recordedAt timestamp. Defaults to position. */
  readonly recordedAt?: number;
}

/**
 * Builds a {@link StoredEvent} with sensible defaults for tests.
 *
 * @param spec - event specification
 * @returns the stored event
 */
export function buildStoredEvent(spec: StoredEventSpec): StoredEvent {
  return {
    eventId: `evt-${spec.position}` as EventId,
    streamId: asStreamId(spec.streamId ?? 'TestStream-test'),
    version: spec.position,
    globalPosition: spec.position,
    eventType: spec.eventType ?? `TestEvent${spec.position}`,
    eventVersion: spec.eventVersion ?? 1,
    data: spec.data ?? '{}',
    metadata: spec.metadata ?? '{}',
    recordedAt: spec.recordedAt ?? spec.position,
  };
}

/**
 * Builds a sequence of {@link StoredEvent}s with positions 1..count.
 *
 * @param count - number of events to build
 * @param spec - optional overrides applied to every event
 * @returns the event sequence in position order
 */
export function buildStoredEventSequence(
  count: number,
  spec?: Omit<StoredEventSpec, 'position'>,
): StoredEvent[] {
  return Array.from({ length: count }, (_, index) =>
    buildStoredEvent({ ...spec, position: index + 1 }),
  );
}

/**
 * Read-only {@link EventStore} stub serving a fixed event list for replay
 * tests. Write operations reject; only stream() is supported.
 */
export class EventStoreStub implements EventStore {
  private readonly events: readonly StoredEvent[];

  /**
   * @param events - events served by stream(), any order (sorted internally)
   */
  constructor(events: readonly StoredEvent[]) {
    this.events = [...events].sort((left, right) => left.globalPosition - right.globalPosition);
  }

  append(): Promise<AppendResult> {
    return Promise.reject(new Error('EventStoreStub is read-only'));
  }

  load(): Promise<EventStream> {
    return Promise.reject(new Error('EventStoreStub is read-only'));
  }

  loadFromVersion(): Promise<EventStream> {
    return Promise.reject(new Error('EventStoreStub is read-only'));
  }

  async *stream(options?: StreamOptions): AsyncIterable<StoredEvent> {
    for (const event of this.events) {
      if (options?.fromPosition !== undefined && event.globalPosition <= options.fromPosition) {
        continue;
      }
      if (options?.toPosition !== undefined && event.globalPosition > options.toPosition) {
        continue;
      }
      yield await Promise.resolve(event);
    }
  }
}

/** A {@link ReplayEventSink} plus the events it collected. */
export interface CollectingSink {
  /** Sink to hand to the replay coordinator. */
  readonly sink: ReplayEventSink;
  /** Events delivered to the sink, in delivery order. */
  readonly events: StoredEvent[];
}

/**
 * Creates a sink that collects every replayed event for assertions.
 *
 * @returns the collecting sink
 */
export function createCollectingSink(): CollectingSink {
  const events: StoredEvent[] = [];
  return {
    events,
    sink: (event) => {
      events.push(event);
      return Promise.resolve();
    },
  };
}
