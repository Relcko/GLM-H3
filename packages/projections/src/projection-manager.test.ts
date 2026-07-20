
import { ConflictError } from '@relcko/errors';
import { InMemoryEventBus } from '@relcko/event-bus';
import { EXPECTED_VERSION_ANY, asStreamId } from '@relcko/event-store';
import { createEnvelope } from '@relcko/events';
import { FixedClock, InMemoryEventStore, JsonEventSerializer } from '@relcko/test-utils';
import { describe, expect, it } from 'vitest';

import { InMemoryCheckpointStore } from './checkpoint';
import { ProjectionAlreadyRegisteredError, ProjectionNotFoundError } from './errors';
import { ProjectionManager } from './projection-manager';

import type { Projection } from './projection';
import type { EventEnvelope } from '@relcko/events';
import type { CorrelationId } from '@relcko/types';

class RecordingProjection implements Projection {
  readonly received: EventEnvelope[] = [];
  resetCalls = 0;

  constructor(
    readonly name: string,
    readonly handledEventTypes: readonly string[] = [],
  ) {}

  handle(envelope: EventEnvelope): Promise<void> {
    this.received.push(envelope);
    return Promise.resolve();
  }

  reset(): Promise<void> {
    this.resetCalls += 1;
    this.received.length = 0;
    return Promise.resolve();
  }
}

class FailingProjection extends RecordingProjection {
  override handle(_envelope: EventEnvelope): Promise<void> {
    return Promise.reject(new Error('projection store unavailable'));
  }
}

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;
const envelope = (type: string): EventEnvelope =>
  createEnvelope('Counter', 'counter-1', type, { amount: 1 }, correlationId(), {
    producer: 'projection-test',
  });

const streamId = asStreamId('Counter-counter-1');

const setup = (): {
  store: InMemoryEventStore;
  bus: InMemoryEventBus;
  checkpoints: InMemoryCheckpointStore;
  clock: FixedClock;
  manager: ProjectionManager;
} => {
  const store = new InMemoryEventStore();
  const bus = new InMemoryEventBus();
  const checkpoints = new InMemoryCheckpointStore();
  const clock = new FixedClock(1_000);
  const manager = new ProjectionManager({
    eventStore: store,
    eventBus: bus,
    checkpointStore: checkpoints,
    deserializer: new JsonEventSerializer(),
    clock,
  });
  return { store, bus, checkpoints, clock, manager };
};

const seed = async (store: InMemoryEventStore, types: readonly string[]): Promise<void> => {
  await store.append(streamId, types.map(envelope), {
    expectedVersion: EXPECTED_VERSION_ANY,
  });
};

describe('ProjectionManager', () => {
  it('register_should_reject_duplicate_names', () => {
    const { manager } = setup();
    manager.register(new RecordingProjection('a'));

    expect(() => { manager.register(new RecordingProjection('a')); }).toThrow(
      ProjectionAlreadyRegisteredError,
    );
    expect(manager.get('a')).toBeDefined();
    expect(manager.list()).toHaveLength(1);
  });

  it('catchUp_should_process_only_handled_event_types_and_checkpoint_progress', async () => {
    const { store, manager, checkpoints, clock } = setup();
    const projection = new RecordingProjection('p1', ['CounterIncremented']);
    manager.register(projection);
    await seed(store, ['CounterIncremented', 'CounterDecremented', 'CounterIncremented']);

    const result = await manager.catchUp('p1');

    expect(result).toEqual({ projectionName: 'p1', processedCount: 3, lastPosition: 3 });
    expect(projection.received.map((event) => metadata(event).eventType)).toEqual([
      'CounterIncremented',
      'CounterIncremented',
    ]);
    const checkpoint = await checkpoints.load('p1');
    expect(checkpoint?.position).toBe(3);
    expect(checkpoint?.updatedAt).toBe(1_000);
    clock.advance(1);
  });

  it('catchUp_should_resume_from_the_checkpoint_and_process_only_new_events', async () => {
    const { store, manager } = setup();
    const projection = new RecordingProjection('p1');
    manager.register(projection);
    await seed(store, ['E1', 'E2']);

    await manager.catchUp('p1');
    await seed(store, ['E3', 'E4']);
    const second = await manager.catchUp('p1');

    expect(second.processedCount).toBe(2);
    expect(second.lastPosition).toBe(4);
    expect(projection.received.map((event) => metadata(event).eventType)).toEqual([
      'E1',
      'E2',
      'E3',
      'E4',
    ]);
  });

  it('catchUp_should_reject_unknown_projections_and_concurrent_runs', async () => {
    const { manager } = setup();

    await expect(manager.catchUp('missing')).rejects.toThrow(ProjectionNotFoundError);
  });

  it('catchUp_should_reject_concurrent_invocations', async () => {
    const { manager } = setup();
    const projection = new RecordingProjection('p1');
    manager.register(projection);

    const first = manager.catchUp('p1');
    await expect(manager.catchUp('p1')).rejects.toThrow(ConflictError);
    await first;
  });

  it('replay_should_reset_and_rebuild_the_projection_from_scratch', async () => {
    const { store, manager, checkpoints } = setup();
    const projection = new RecordingProjection('p1');
    manager.register(projection);
    await seed(store, ['E1', 'E2']);

    await manager.catchUp('p1');
    expect(projection.received).toHaveLength(2);

    const rebuilt = await manager.replay('p1');

    expect(projection.resetCalls).toBe(1);
    expect(rebuilt.processedCount).toBe(2);
    expect(projection.received.map((event) => metadata(event).eventType)).toEqual(['E1', 'E2']);
    const checkpoint = await checkpoints.load('p1');
    expect(checkpoint?.position).toBe(2);
  });

  it('replay_should_honor_an_upper_bound_for_partial_rebuilds', async () => {
    const { store, manager } = setup();
    const projection = new RecordingProjection('p1');
    manager.register(projection);
    await seed(store, ['E1', 'E2', 'E3', 'E4']);

    const rebuilt = await manager.replay('p1', { toPosition: 2 });

    expect(rebuilt.processedCount).toBe(2);
    expect(rebuilt.lastPosition).toBe(2);
    expect(projection.received.map((event) => metadata(event).eventType)).toEqual(['E1', 'E2']);
  });

  it('rebuilt_state_should_match_live_processed_state_for_the_same_stream', async () => {
    const { store, manager } = setup();
    const first = new RecordingProjection('first');
    const second = new RecordingProjection('second');
    manager.register(first);
    manager.register(second);
    await seed(store, ['E1', 'E2', 'E3']);

    await manager.catchUp('first');
    await manager.replay('second');

    expect(second.received.map((event) => metadata(event).eventType)).toEqual(
      first.received.map((event) => metadata(event).eventType),
    );
  });

  it('live_mode_should_dispatch_bus_events_to_matching_projections', async () => {
    const { bus, manager } = setup();
    const all = new RecordingProjection('all');
    const filtered = new RecordingProjection('filtered', ['Wanted']);
    manager.register(all);
    manager.register(filtered);

    manager.startLive();
    expect(manager.isLive).toBe(true);
    manager.startLive();

    await bus.publish(envelope('Wanted'));
    await bus.publish(envelope('Unwanted'));

    expect(all.received).toHaveLength(2);
    expect(filtered.received).toHaveLength(1);

    manager.stopLive();
    expect(manager.isLive).toBe(false);
    await bus.publish(envelope('AfterStop'));
    expect(all.received).toHaveLength(2);
  });

  it('live_mode_should_isolate_projection_failures', async () => {
    const { bus, manager } = setup();
    const failing = new FailingProjection('failing');
    const healthy = new RecordingProjection('healthy');
    manager.register(failing);
    manager.register(healthy);

    manager.startLive();
    await bus.publish(envelope('LiveEvent'));

    expect(healthy.received).toHaveLength(1);
  });
});

const metadata = (envelope: EventEnvelope): { eventType: string } => envelope.metadata;
