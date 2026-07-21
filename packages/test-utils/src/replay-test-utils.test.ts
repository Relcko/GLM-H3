import { ReplayCoordinator, ReplayMode } from '@relcko/replay';
import { describe, expect, it } from 'vitest';


import { FixedClock } from './fixed-clock';
import {
  buildStoredEvent,
  buildStoredEventSequence,
  createCollectingSink,
  EventStoreStub,
} from './replay-test-utils';

describe('replay test utils', () => {
  it('buildStoredEvent_should_apply_defaults_and_overrides', () => {
    const event = buildStoredEvent({ position: 3, eventType: 'Custom', data: '{"a":1}' });

    expect(event.globalPosition).toBe(3);
    expect(event.version).toBe(3);
    expect(event.eventType).toBe('Custom');
    expect(event.data).toBe('{"a":1}');
    expect(event.eventVersion).toBe(1);
  });

  it('buildStoredEventSequence_should_build_positions_1_to_count', () => {
    const events = buildStoredEventSequence(4, { eventType: 'Same' });

    expect(events.map((event) => event.globalPosition)).toEqual([1, 2, 3, 4]);
    expect(events.every((event) => event.eventType === 'Same')).toBe(true);
  });

  it('EventStoreStub_should_stream_sorted_events_with_bounds', async () => {
    const stub = new EventStoreStub([
      buildStoredEvent({ position: 3 }),
      buildStoredEvent({ position: 1 }),
      buildStoredEvent({ position: 2 }),
    ]);

    const collected: number[] = [];
    for await (const event of stub.stream({ fromPosition: 1 })) {
      collected.push(event.globalPosition);
    }

    expect(collected).toEqual([2, 3]);
  });

  it('EventStoreStub_should_reject_writes', async () => {
    const stub = new EventStoreStub([]);

    await expect(stub.append()).rejects.toThrow('read-only');
    await expect(stub.load()).rejects.toThrow('read-only');
    await expect(stub.loadFromVersion()).rejects.toThrow('read-only');
  });

  it('createCollectingSink_should_work_with_the_replay_coordinator', async () => {
    const coordinator = new ReplayCoordinator({
      eventStore: new EventStoreStub(buildStoredEventSequence(3)),
      clock: new FixedClock(0),
    });
    const collecting = createCollectingSink();

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      sink: collecting.sink,
    });

    expect(result.status).toBe('completed');
    expect(collecting.events.map((event) => event.globalPosition)).toEqual([1, 2, 3]);
  });
});
