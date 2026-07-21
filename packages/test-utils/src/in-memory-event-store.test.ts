
import { EXPECTED_VERSION_ANY, OptimisticConcurrencyError, asStreamId } from '@relcko/event-store';
import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';

import { InMemoryEventStore, JsonEventSerializer } from './in-memory-event-store';

import type { StoredEvent } from '@relcko/event-store';
import type { EventEnvelope } from '@relcko/events';
import type { CorrelationId } from '@relcko/types';

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;
const stream = (name: string) => asStreamId(name);
const envelope = (type: string): EventEnvelope =>
  createEnvelope('Counter', 'counter-1', type, { amount: 1 }, correlationId(), {
    producer: 'test-utils',
  });

const collect = async (source: AsyncIterable<StoredEvent>): Promise<StoredEvent[]> => {
  const events: StoredEvent[] = [];
  for await (const event of source) {
    events.push(event);
  }
  return events;
};

describe('InMemoryEventStore', () => {
  it('append_should_assign_gapless_versions_positions_and_serialize_payloads', async () => {
    const store = new InMemoryEventStore();

    await store.append(stream('A'), [envelope('E1'), envelope('E2')], { expectedVersion: 0 });
    await store.append(stream('B'), [envelope('E3')], { expectedVersion: 0 });
    const result = await store.append(stream('A'), [envelope('E4')], { expectedVersion: 2 });

    expect(result).toMatchObject({ version: 3, appendedCount: 1 });

    const view = await store.load(stream('A'));
    expect(view.events.map((event) => event.version)).toEqual([1, 2, 3]);
    expect(view.events.map((event) => event.globalPosition)).toEqual([1, 2, 4]);
    expect(JSON.parse(view.events[0]?.data ?? '')).toEqual({ amount: 1 });
  });

  it('append_should_enforce_optimistic_concurrency', async () => {
    const store = new InMemoryEventStore();
    await store.append(stream('A'), [envelope('E1')], { expectedVersion: 0 });

    await expect(
      store.append(stream('A'), [envelope('E2')], { expectedVersion: 3 }),
    ).rejects.toThrow(OptimisticConcurrencyError);
    await expect(
      store.append(stream('A'), [envelope('E2')], { expectedVersion: EXPECTED_VERSION_ANY }),
    ).resolves.toMatchObject({ version: 2 });
  });

  it('loadFromVersion_should_slice_the_stream', async () => {
    const store = new InMemoryEventStore();
    await store.append(stream('A'), [envelope('E1'), envelope('E2'), envelope('E3')], {
      expectedVersion: 0,
    });

    const view = await store.loadFromVersion(stream('A'), 2);

    expect(view.version).toBe(3);
    expect(view.events.map((event) => event.eventType)).toEqual(['E2', 'E3']);
  });

  it('stream_should_yield_global_order_with_bounds', async () => {
    const store = new InMemoryEventStore();
    await store.append(stream('A'), [envelope('E1'), envelope('E2')], { expectedVersion: 0 });
    await store.append(stream('B'), [envelope('E3'), envelope('E4')], { expectedVersion: 0 });

    const all = await collect(store.stream());
    const bounded = await collect(store.stream({ fromPosition: 1, toPosition: 3 }));

    expect(all.map((event) => event.eventType)).toEqual(['E1', 'E2', 'E3', 'E4']);
    expect(bounded.map((event) => event.eventType)).toEqual(['E2', 'E3']);
  });

  it('snapshot_should_replace_same_version_and_load_latest', async () => {
    const store = new InMemoryEventStore();
    const streamA = stream('A');

    await store.snapshot({ streamId: streamA, version: 2, state: '{"c":2}', takenAt: 2 });
    await store.snapshot({ streamId: streamA, version: 5, state: '{"c":5}', takenAt: 5 });
    await store.snapshot({ streamId: streamA, version: 2, state: '{"c":22}', takenAt: 22 });

    const latest = await store.loadLatest(streamA);
    const atThree = await store.loadAtVersion(streamA, 3);
    const none = await store.loadAtVersion(streamA, 1);

    expect(latest?.version).toBe(5);
    expect(atThree?.state).toBe('{"c":22}');
    expect(none).toBeNull();
  });

  it('clear_should_reset_streams_positions_and_snapshots', async () => {
    const store = new InMemoryEventStore();
    await store.append(stream('A'), [envelope('E1')], { expectedVersion: 0 });
    await store.snapshot({ streamId: stream('A'), version: 1, state: '{}', takenAt: 1 });

    store.clear();

    const view = await store.load(stream('A'));
    expect(view.version).toBe(0);
    await expect(store.loadLatest(stream('A'))).resolves.toBeNull();
    const result = await store.append(stream('B'), [envelope('E2')], { expectedVersion: 0 });
    expect(result.version).toBe(1);
    const events = await collect(store.stream());
    expect(events[0]?.globalPosition).toBe(1);
  });
});

describe('JsonEventSerializer', () => {
  it('should_round_trip_envelopes', () => {
    const serializer = new JsonEventSerializer();
    const original = envelope('CounterIncremented');

    const restored = serializer.deserialize(serializer.serialize(original));

    expect(restored.metadata).toEqual(original.metadata);
    expect(restored.payload).toEqual(original.payload);
  });
});
