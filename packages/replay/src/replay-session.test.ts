import { ConflictError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { ReplayMode } from './replay-mode';
import { ReplayProgressTracker } from './replay-progress';
import { ReplaySession } from './replay-session';

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

const session = (clock: Clock): ReplaySession =>
  new ReplaySession({
    id: 'session-1',
    mode: ReplayMode.Full,
    fromPosition: 0,
    clock,
  });

describe('ReplayProgressTracker', () => {
  it('should_track_processed_count_and_last_position', () => {
    const clock = new FixedClock(1_000);
    const tracker = new ReplayProgressTracker(clock);

    tracker.record(makeEvent(1));
    clock.advance(500);
    tracker.record(makeEvent(2));

    const snapshot = tracker.snapshot();
    expect(snapshot.processedCount).toBe(2);
    expect(snapshot.lastPosition).toBe(2);
    expect(snapshot.startedAt).toEqual(new Date(1_000));
    expect(snapshot.eventsPerSecond).toBeGreaterThan(0);
  });

  it('should_report_zero_rate_when_no_time_has_passed', () => {
    const clock = new FixedClock(1_000);
    const tracker = new ReplayProgressTracker(clock);

    expect(tracker.snapshot().eventsPerSecond).toBe(0);
  });
});

describe('ReplaySession', () => {
  it('should_follow_the_happy_path_lifecycle', () => {
    const clock = new FixedClock(1_000);
    const tracker = new ReplayProgressTracker(clock);
    const subject = session(clock);

    expect(subject.status).toBe('pending');
    expect(subject.progress).toBeUndefined();

    subject.start(tracker.snapshot());
    expect(subject.status).toBe('running');

    tracker.record(makeEvent(1));
    clock.advance(100);
    subject.complete(tracker.snapshot());

    expect(subject.status).toBe('completed');
    expect(subject.progress?.processedCount).toBe(1);
    expect(subject.finishedAt).toEqual(new Date(1_100));
  });

  it('start_should_reject_when_not_pending', () => {
    const clock = new FixedClock(0);
    const tracker = new ReplayProgressTracker(clock);
    const subject = session(clock);
    subject.start(tracker.snapshot());

    expect(() => { subject.start(tracker.snapshot()); }).toThrow(ConflictError);
  });

  it('complete_should_reject_when_not_running', () => {
    const clock = new FixedClock(0);
    const tracker = new ReplayProgressTracker(clock);
    const subject = session(clock);

    expect(() => { subject.complete(tracker.snapshot()); }).toThrow(ConflictError);
  });

  it('fail_should_capture_the_error_message', () => {
    const clock = new FixedClock(0);
    const tracker = new ReplayProgressTracker(clock);
    const subject = session(clock);
    subject.start(tracker.snapshot());
    subject.fail(tracker.snapshot(), 'sink exploded');

    expect(subject.status).toBe('failed');
    expect(subject.errorMessage).toBe('sink exploded');
    expect(subject.finishedAt).toBeDefined();
  });

  it('cancel_should_work_from_pending_and_running', () => {
    const clock = new FixedClock(0);
    const pending = session(clock);
    pending.cancel();
    expect(pending.status).toBe('cancelled');

    const running = session(clock);
    running.start(new ReplayProgressTracker(clock).snapshot());
    running.cancel();
    expect(running.status).toBe('cancelled');
  });

  it('cancel_should_reject_from_terminal_states', () => {
    const clock = new FixedClock(0);
    const subject = session(clock);
    subject.start(new ReplayProgressTracker(clock).snapshot());
    subject.complete(new ReplayProgressTracker(clock).snapshot());

    expect(() => { subject.cancel(); }).toThrow(ConflictError);
  });

  it('report_should_update_the_latest_progress', () => {
    const clock = new FixedClock(0);
    const tracker = new ReplayProgressTracker(clock);
    const subject = session(clock);
    subject.start(tracker.snapshot());

    tracker.record(makeEvent(7));
    subject.report(tracker.snapshot());

    expect(subject.progress?.lastPosition).toBe(7);
  });
});
