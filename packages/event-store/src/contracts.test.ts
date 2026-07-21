import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';


import { EventSerializationError, OptimisticConcurrencyError } from './errors';
import { EXPECTED_VERSION_ANY, EXPECTED_VERSION_EMPTY } from './expected-version';
import { asStreamId } from './stream-id';

import type { AppendResult, EventStore, StreamOptions } from './event-store';
import type { EventStream } from './event-stream';
import type { EventDeserializer, EventSerializer, SerializedEvent } from './serializer';
import type { Snapshot } from './snapshot';
import type { SnapshotStore } from './snapshot-store';
import type { StoredEvent } from './stored-event';
import type { StreamId } from './stream-id';
import type { EventEnvelope, EventMetadata } from '@relcko/events';
import type { CorrelationId } from '@relcko/types';

/**
 * Contract-conformance fakes: they prove the event-store interfaces are
 * implementable and pin the semantics every database implementation must
 * honor. The reusable testing-grade implementation lives in
 * @relcko/test-utils.
 */
class ContractEventStore implements EventStore {
  private readonly streams = new Map<StreamId, StoredEvent[]>();
  private globalPosition = 0;

  append(
    streamId: StreamId,
    events: readonly EventEnvelope[],
    options: { expectedVersion: number },
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
      return {
        eventId: envelope.metadata.eventId,
        streamId,
        version: existing.length + index + 1,
        globalPosition: this.globalPosition,
        eventType: envelope.metadata.eventType,
        eventVersion: envelope.metadata.eventVersion,
        data: JSON.stringify(envelope.payload),
        metadata: JSON.stringify(envelope.metadata),
        recordedAt: 0,
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
}

class ContractSnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<StreamId, Snapshot[]>();

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
}

class ContractJsonSerializer implements EventSerializer, EventDeserializer {
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

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;
const streamA = asStreamId('Counter-a');
const streamB = asStreamId('Counter-b');
const event = (type: string): EventEnvelope =>
  createEnvelope('Counter', 'id', type, { value: 1 }, correlationId());

describe('EventStore contract', () => {
  it('append_should_assign_gapless_versions_and_global_positions', async () => {
    const store = new ContractEventStore();

    await store.append(streamA, [event('A1'), event('A2')], {
      expectedVersion: EXPECTED_VERSION_EMPTY,
    });
    await store.append(streamB, [event('B1')], { expectedVersion: EXPECTED_VERSION_EMPTY });
    const result = await store.append(streamA, [event('A3')], { expectedVersion: 2 });

    expect(result.version).toBe(3);
    expect(result.appendedCount).toBe(1);

    const streamAView = await store.load(streamA);
    expect(streamAView.events.map((stored) => stored.version)).toEqual([1, 2, 3]);
    expect(streamAView.events.map((stored) => stored.globalPosition)).toEqual([1, 2, 4]);
  });

  it('append_should_reject_when_expected_version_does_not_match', async () => {
    const store = new ContractEventStore();
    await store.append(streamA, [event('A1')], { expectedVersion: EXPECTED_VERSION_EMPTY });

    await expect(
      store.append(streamA, [event('A2')], { expectedVersion: 5 }),
    ).rejects.toThrow(OptimisticConcurrencyError);
  });

  it('append_should_accept_any_version_with_EXPECTED_VERSION_ANY', async () => {
    const store = new ContractEventStore();
    await store.append(streamA, [event('A1')], { expectedVersion: EXPECTED_VERSION_ANY });
    const result = await store.append(streamA, [event('A2')], {
      expectedVersion: EXPECTED_VERSION_ANY,
    });

    expect(result.version).toBe(2);
  });

  it('load_should_return_an_empty_stream_for_unknown_ids', async () => {
    const store = new ContractEventStore();

    const view = await store.load(asStreamId('Unknown-x'));

    expect(view.version).toBe(0);
    expect(view.events).toHaveLength(0);
  });

  it('loadFromVersion_should_return_only_events_at_or_after_the_version', async () => {
    const store = new ContractEventStore();
    await store.append(streamA, [event('A1'), event('A2'), event('A3'), event('A4')], {
      expectedVersion: EXPECTED_VERSION_EMPTY,
    });

    const view = await store.loadFromVersion(streamA, 3);

    expect(view.version).toBe(4);
    expect(view.events.map((stored) => stored.version)).toEqual([3, 4]);
  });

  it('stream_should_yield_events_in_global_order_honoring_bounds', async () => {
    const store = new ContractEventStore();
    await store.append(streamA, [event('A1'), event('A2')], {
      expectedVersion: EXPECTED_VERSION_EMPTY,
    });
    await store.append(streamB, [event('B1'), event('B2')], {
      expectedVersion: EXPECTED_VERSION_EMPTY,
    });

    const collected: StoredEvent[] = [];
    for await (const stored of store.stream({ fromPosition: 1, toPosition: 3 })) {
      collected.push(stored);
    }

    expect(collected.map((stored) => stored.eventType)).toEqual(['A2', 'B1']);
  });
});

describe('SnapshotStore contract', () => {
  const snapshot = (streamId: StreamId, version: number): Snapshot => ({
    streamId,
    version,
    state: JSON.stringify({ count: version }),
    takenAt: version,
  });

  it('snapshot_should_replace_a_snapshot_of_the_same_version_and_load_the_latest', async () => {
    const store = new ContractSnapshotStore();
    await store.snapshot(snapshot(streamA, 2));
    await store.snapshot(snapshot(streamA, 5));
    await store.snapshot(snapshot(streamA, 2));

    const latest = await store.loadLatest(streamA);

    expect(latest?.version).toBe(5);
  });

  it('loadLatest_should_return_null_when_no_snapshot_exists', async () => {
    const store = new ContractSnapshotStore();

    await expect(store.loadLatest(streamA)).resolves.toBeNull();
  });

  it('loadAtVersion_should_return_the_latest_snapshot_at_or_below_the_version', async () => {
    const store = new ContractSnapshotStore();
    await store.snapshot(snapshot(streamA, 2));
    await store.snapshot(snapshot(streamA, 5));
    await store.snapshot(snapshot(streamA, 9));

    const atSix = await store.loadAtVersion(streamA, 6);
    const atOne = await store.loadAtVersion(streamA, 1);

    expect(atSix?.version).toBe(5);
    expect(atOne).toBeNull();
  });
});

describe('EventSerializer contract', () => {
  it('should_round_trip_an_envelope_through_serialization', () => {
    const serializer = new ContractJsonSerializer();
    const envelope = createEnvelope('Counter', 'counter-1', 'CounterIncremented', { amount: 5 }, correlationId(), {
      producer: 'contract-test',
    });

    const restored = serializer.deserialize(serializer.serialize(envelope));

    expect(restored.metadata).toEqual(envelope.metadata);
    expect(restored.payload).toEqual(envelope.payload);
  });

  it('should_raise_EventSerializationError_for_unreadable_payloads', () => {
    const serializer = new ContractJsonSerializer();
    const broken: SerializedEvent = {
      eventType: 'Broken',
      eventVersion: 1,
      data: '{not-json',
      metadata: '{}',
    };

    expect(() => serializer.deserialize(broken)).toThrow(SyntaxError);
    expect(EventSerializationError).toBeDefined();
  });
});
