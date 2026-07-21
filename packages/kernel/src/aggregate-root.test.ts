import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { AggregateRoot } from './aggregate-root';
import { DomainEvent } from './domain-event';

import type { DomainEventProps } from './domain-event';
import type { EventId } from '@relcko/types';

class CounterIncremented extends DomainEvent {
  constructor(
    props: DomainEventProps,
    readonly amount: number,
  ) {
    super(props);
  }

  readonly eventType = 'CounterIncremented';
}

class Counter extends AggregateRoot<string> {
  readonly aggregateType = 'Counter';

  private _count = 0;

  private constructor(id: string) {
    super(id);
  }

  static create(id: string): Counter {
    return new Counter(id);
  }

  get count(): number {
    return this._count;
  }

  increment(amount: number, eventId: EventId, occurredAt: Date): void {
    this.apply(
      new CounterIncremented(
        {
          eventId,
          aggregateId: this.id,
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        amount,
      ),
    );
  }

  applyEvent(event: DomainEvent): void {
    this.apply(event);
  }

  protected when(event: DomainEvent): void {
    if (event instanceof CounterIncremented) {
      this._count += event.amount;
    }
  }
}

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = new Date('2026-07-19T00:00:00.000Z');

describe('AggregateRoot', () => {
  it('starts at version 0 with no uncommitted events', () => {
    const counter = Counter.create('counter-1');
    expect(counter.version).toBe(0);
    expect(counter.getUncommittedEvents()).toHaveLength(0);
  });

  it('apply_should_fold_event_into_state_and_track_it_as_uncommitted', () => {
    const counter = Counter.create('counter-1');
    counter.increment(5, nextEventId(), at);

    expect(counter.count).toBe(5);
    expect(counter.version).toBe(1);
    expect(counter.getUncommittedEvents()).toHaveLength(1);
  });

  it('apply_should_enforce_gapless_version_sequence', () => {
    const counter = Counter.create('counter-1');
    const invalidEvent = new CounterIncremented(
      {
        eventId: nextEventId(),
        aggregateId: 'counter-1',
        aggregateType: 'Counter',
        aggregateVersion: 7,
        occurredAt: at,
      },
      1,
    );

    expect(() => { counter.increment(1, nextEventId(), at); }).not.toThrow();
    expect(() => { counter.applyEvent(invalidEvent); }).toThrow(InvariantViolationError);
  });

  it('apply_should_reject_events_targeting_another_aggregate_instance', () => {
    const counter = Counter.create('counter-1');
    const foreignEvent = new CounterIncremented(
      {
        eventId: nextEventId(),
        aggregateId: 'counter-99',
        aggregateType: 'Counter',
        aggregateVersion: 1,
        occurredAt: at,
      },
      1,
    );

    expect(() => { counter.applyEvent(foreignEvent); }).toThrow(InvariantViolationError);
  });

  it('markEventsAsCommitted_should_clear_uncommitted_events', () => {
    const counter = Counter.create('counter-1');
    counter.increment(3, nextEventId(), at);
    counter.markEventsAsCommitted();

    expect(counter.getUncommittedEvents()).toHaveLength(0);
    expect(counter.version).toBe(1);
  });

  it('loadFromHistory_should_rebuild_identical_state_from_events', () => {
    const original = Counter.create('counter-1');
    original.increment(2, nextEventId(), at);
    original.increment(4, nextEventId(), at);
    original.increment(8, nextEventId(), at);
    const history = original.getUncommittedEvents();

    const rebuilt = Counter.create('counter-1');
    rebuilt.loadFromHistory(history);

    expect(rebuilt.count).toBe(original.count);
    expect(rebuilt.version).toBe(3);
    expect(rebuilt.getUncommittedEvents()).toHaveLength(0);
  });

  it('replay_should_produce_identical_state_across_runs', () => {
    const original = Counter.create('counter-1');
    original.increment(1, nextEventId(), at);
    original.increment(2, nextEventId(), at);
    const history = original.getUncommittedEvents();

    const first = Counter.create('counter-1');
    const second = Counter.create('counter-1');
    first.loadFromHistory(history);
    second.loadFromHistory(history);

    expect(first.count).toBe(second.count);
    expect(first.version).toBe(second.version);
  });

  it('loadFromHistory_should_reject_events_with_mismatched_aggregate_id', () => {
    const tampered = [
      new CounterIncremented(
        { eventId: nextEventId(), aggregateId: 'counter-other', aggregateType: 'Counter', aggregateVersion: 1, occurredAt: at },
        99,
      ),
    ];
    const counter = Counter.create('counter-1');
    expect(() => { counter.loadFromHistory(tampered); }).toThrow(InvariantViolationError);
  });

  it('loadFromHistory_should_reject_out_of_order_versions', () => {
    const outOfOrder = [
      new CounterIncremented(
        { eventId: nextEventId(), aggregateId: 'counter-1', aggregateType: 'Counter', aggregateVersion: 2, occurredAt: at },
        1,
      ),
    ];
    const counter = Counter.create('counter-1');
    expect(() => { counter.loadFromHistory(outOfOrder); }).toThrow(InvariantViolationError);
  });

  it('loadFromHistory_should_reject_events_with_gaps', () => {
    const withGap = [
      new CounterIncremented(
        { eventId: nextEventId(), aggregateId: 'counter-1', aggregateType: 'Counter', aggregateVersion: 1, occurredAt: at },
        1,
      ),
      new CounterIncremented(
        { eventId: nextEventId(), aggregateId: 'counter-1', aggregateType: 'Counter', aggregateVersion: 3, occurredAt: at },
        3,
      ),
    ];
    const counter = Counter.create('counter-1');
    expect(() => { counter.loadFromHistory(withGap); }).toThrow(InvariantViolationError);
  });

  it('loadFromHistory_should_handle_empty_history_gracefully', () => {
    const counter = Counter.create('counter-1');
    expect(() => { counter.loadFromHistory([]); }).not.toThrow();
    expect(counter.version).toBe(0);
    expect(counter.count).toBe(0);
  });
});
