import { AggregateRoot, DomainEvent } from '@relcko/kernel';
import { describe, expect, it } from 'vitest';

import { aggregateFixture } from './aggregate-fixture';


import type { DomainEventProps } from '@relcko/kernel';
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

  protected when(event: DomainEvent): void {
    if (event instanceof CounterIncremented) {
      this._count += event.amount;
    }
  }
}

const eventId = (): EventId => crypto.randomUUID() as EventId;
const at = new Date('2026-07-19T00:00:00.000Z');

const buildHistory = (): readonly DomainEvent[] => {
  const counter = Counter.create('counter-1');
  counter.increment(3, eventId(), at);
  counter.increment(4, eventId(), at);
  const history = counter.getUncommittedEvents();
  return history;
};

describe('AggregateFixture', () => {
  it('should_support_given_when_then_flows', () => {
    aggregateFixture(() => Counter.create('counter-1'))
      .given(buildHistory())
      .expectVersion(2)
      .expectNoUncommittedEvents()
      .when((counter) => { counter.increment(5, eventId(), at); })
      .expectVersion(3)
      .expectUncommittedCount(1)
      .expectEventTypes('CounterIncremented');
  });

  it('should_support_givenNothing_for_new_aggregates', () => {
    aggregateFixture(() => Counter.create('counter-1'))
      .givenNothing()
      .expectVersion(0)
      .when((counter) => { counter.increment(2, eventId(), at); })
      .expectEventTypes('CounterIncremented');
  });

  it('should_verify_rebuild_matches_from_uncommitted_events', () => {
    aggregateFixture(() => Counter.create('counter-1'))
      .given(buildHistory())
      .when((counter) => { counter.increment(10, eventId(), at); })
      .expectRebuildMatches((rebuilt, current) => {
        expect(rebuilt.count).toBe(current.count);
        expect(rebuilt.version).toBe(current.version);
      });
  });

  it('should_expose_custom_event_assertions', () => {
    aggregateFixture(() => Counter.create('counter-1'))
      .givenNothing()
      .when((counter) => { counter.increment(7, eventId(), at); })
      .expectEvents((events) => {
        expect(events[0]).toBeInstanceOf(CounterIncremented);
        expect((events[0] as CounterIncremented).amount).toBe(7);
      });
  });

  it('should_fail_fast_when_used_before_given', () => {
    expect(() =>
      aggregateFixture(() => Counter.create('counter-1')).when(() => undefined),
    ).toThrow('call given() or givenNothing() first');
  });
});
