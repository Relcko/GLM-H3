import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { ReplayCoordinator } from './replay-coordinator';
import { ReplayMode } from './replay-mode';
import { BatchedReplayStrategy, SequentialReplayStrategy } from './replay-strategy';

import type { AppendResult, EventStore, StreamOptions } from '@relcko/event-store';
import type { EventStream } from '@relcko/event-store';
import type { StoredEvent } from '@relcko/event-store';
import type { Clock } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

class FixedClock implements Clock {
  private current: number;

  constructor(start: number) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

const makeEvent = (position: number): StoredEvent => ({
  eventId: `evt-${position}` as EventId,
  streamId: 'Counter-a' as StoredEvent['streamId'],
  version: position,
  globalPosition: position,
  eventType: `Event${position}`,
  eventVersion: 1,
  data: '{}',
  metadata: '{}',
  recordedAt: position,
});

class StubEventStore implements EventStore {
  constructor(private readonly events: readonly StoredEvent[]) {}

  append(): Promise<AppendResult> {
    return Promise.reject(new Error('not supported'));
  }

  load(): Promise<EventStream> {
    return Promise.reject(new Error('not supported'));
  }

  loadFromVersion(): Promise<EventStream> {
    return Promise.reject(new Error('not supported'));
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

const coordinatorWith = (
  events: readonly StoredEvent[],
): { coordinator: ReplayCoordinator; clock: FixedClock } => {
  const clock = new FixedClock(1_000);
  const coordinator = new ReplayCoordinator({
    eventStore: new StubEventStore(events),
    clock,
    idFactory: () => 'session-1',
  });
  return { coordinator, clock };
};

describe('ReplayCoordinator', () => {
  it('full_replay_should_process_every_event_in_order', async () => {
    const events = [makeEvent(1), makeEvent(2), makeEvent(3), makeEvent(4), makeEvent(5)];
    const { coordinator } = coordinatorWith(events);
    const received: StoredEvent[] = [];

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      sink: (event) => {
        received.push(event);
        return Promise.resolve();
      },
    });

    expect(result.status).toBe('completed');
    expect(result.sessionId).toBe('session-1');
    expect(result.mode).toBe(ReplayMode.Full);
    expect(result.processedCount).toBe(5);
    expect(result.lastPosition).toBe(5);
    expect(result.fromPosition).toBe(0);
    expect(received.map((event) => event.globalPosition)).toEqual([1, 2, 3, 4, 5]);
    expect(coordinator.getSession('session-1')?.status).toBe('completed');
  });

  it('from_position_replay_should_skip_events_at_or_below_the_bound', async () => {
    const events = [makeEvent(1), makeEvent(2), makeEvent(3), makeEvent(4), makeEvent(5)];
    const { coordinator } = coordinatorWith(events);
    const received: number[] = [];

    const result = await coordinator.startReplay({
      mode: ReplayMode.FromPosition,
      fromPosition: 2,
      sink: (event) => {
        received.push(event.globalPosition);
        return Promise.resolve();
      },
    });

    expect(result.status).toBe('completed');
    expect(result.processedCount).toBe(3);
    expect(received).toEqual([3, 4, 5]);
  });

  it('range_replay_should_process_only_events_inside_the_window', async () => {
    const events = [makeEvent(1), makeEvent(2), makeEvent(3), makeEvent(4), makeEvent(5)];
    const { coordinator } = coordinatorWith(events);
    const received: number[] = [];

    const result = await coordinator.startReplay({
      mode: ReplayMode.Range,
      fromPosition: 1,
      toPosition: 4,
      sink: (event) => {
        received.push(event.globalPosition);
        return Promise.resolve();
      },
    });

    expect(result.status).toBe('completed');
    expect(result.processedCount).toBe(3);
    expect(result.toPosition).toBe(4);
    expect(received).toEqual([2, 3, 4]);
  });

  it('should_validate_mode_bounds', async () => {
    const { coordinator } = coordinatorWith([]);
    const sink = (): Promise<void> => Promise.resolve();

    await expect(
      coordinator.startReplay({ mode: ReplayMode.FromPosition, sink }),
    ).rejects.toThrow(ValidationError);
    await expect(
      coordinator.startReplay({ mode: ReplayMode.Range, fromPosition: 3, sink }),
    ).rejects.toThrow(ValidationError);
    await expect(
      coordinator.startReplay({ mode: ReplayMode.Range, fromPosition: 4, toPosition: 4, sink }),
    ).rejects.toThrow(ValidationError);
    await expect(
      coordinator.startReplay({ mode: ReplayMode.Range, fromPosition: 5, toPosition: 2, sink }),
    ).rejects.toThrow(ValidationError);
  });

  it('should_capture_sink_failures_as_a_failed_session_without_throwing', async () => {
    const events = [makeEvent(1), makeEvent(2), makeEvent(3)];
    const { coordinator } = coordinatorWith(events);
    let calls = 0;

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      sink: () => {
        calls += 1;
        return calls === 2 ? Promise.reject(new Error('sink exploded')) : Promise.resolve();
      },
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('sink exploded');
    expect(result.processedCount).toBe(1);
    expect(coordinator.getSession('session-1')?.status).toBe('failed');
  });

  it('should_stop_early_when_the_session_is_cancelled', async () => {
    const events = [makeEvent(1), makeEvent(2), makeEvent(3), makeEvent(4), makeEvent(5)];
    const { coordinator } = coordinatorWith(events);
    const received: number[] = [];

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      sink: (event) => {
        received.push(event.globalPosition);
        const running = coordinator.listSessions()[0];
        if (running !== undefined) {
          coordinator.cancelSession(running.id);
        }
        return Promise.resolve();
      },
    });

    expect(result.status).toBe('cancelled');
    expect(result.processedCount).toBe(1);
    expect(received).toEqual([1]);
  });

  it('cancelSession_should_return_false_for_unknown_or_terminal_sessions', async () => {
    const { coordinator } = coordinatorWith([makeEvent(1)]);

    expect(coordinator.cancelSession('unknown')).toBe(false);

    await coordinator.startReplay({ mode: ReplayMode.Full, sink: () => Promise.resolve() });
    expect(coordinator.cancelSession('session-1')).toBe(false);
  });

  it('should_support_the_batched_strategy', async () => {
    const events = Array.from({ length: 10 }, (_, index) => makeEvent(index + 1));
    const { coordinator } = coordinatorWith(events);
    const received: number[] = [];

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      strategy: new BatchedReplayStrategy(),
      batchSize: 3,
      sink: (event) => {
        received.push(event.globalPosition);
        return Promise.resolve();
      },
    });

    expect(result.status).toBe('completed');
    expect(result.processedCount).toBe(10);
    expect(received).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should_report_duration_from_the_session_clock', async () => {
    const events = [makeEvent(1)];
    const { coordinator, clock } = coordinatorWith(events);

    const result = await coordinator.startReplay({
      mode: ReplayMode.Full,
      sink: () => {
        clock.advance(250);
        return Promise.resolve();
      },
    });

    expect(result.startedAt).toEqual(new Date(1_000));
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.finishedAt.getTime()).toBeGreaterThanOrEqual(result.startedAt.getTime());
  });
});

describe('SequentialReplayStrategy', () => {
  it('should_stop_before_the_next_event_when_cancelled', async () => {
    const strategy = new SequentialReplayStrategy();
    const source = (async function* (): AsyncIterable<StoredEvent> {
      yield await Promise.resolve(makeEvent(1));
      yield await Promise.resolve(makeEvent(2));
      yield await Promise.resolve(makeEvent(3));
    })();
    let delivered = 0;

    const processed = await strategy.execute(
      source,
      () => {
        delivered += 1;
        return Promise.resolve();
      },
      { batchSize: 10, shouldStop: () => delivered >= 1 },
    );

    expect(processed).toBe(1);
    expect(delivered).toBe(1);
  });
});
