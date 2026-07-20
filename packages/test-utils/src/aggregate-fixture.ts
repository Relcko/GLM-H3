import { expect } from 'vitest';

import type { AggregateRoot, DomainEvent } from '@relcko/kernel';

/**
 * Given/When/Then fixture for aggregate tests (Playbook 6.1, 9.5).
 *
 * Drives an aggregate through a history (given), a behavior (when), and
 * assertions on the resulting uncommitted events and version (then),
 * including state-rebuild checks from the event stream.
 *
 * @typeParam TAggregate - aggregate root type under test
 * @typeParam TId - identifier type of the aggregate
 */
export class AggregateFixture<TAggregate extends AggregateRoot<TId>, TId> {
  private aggregate: TAggregate | undefined;
  private history: readonly DomainEvent[] = [];
  private readonly factory: () => TAggregate;

  /**
   * @param factory - creates a fresh aggregate instance
   */
  constructor(factory: () => TAggregate) {
    this.factory = factory;
  }

  /**
   * Loads the aggregate from an existing event history.
   *
   * @param history - previously committed events, ascending by version
   * @returns this fixture for chaining
   */
  given(history: readonly DomainEvent[]): this {
    this.history = history;
    this.aggregate = this.factory();
    this.aggregate.loadFromHistory(history);
    return this;
  }

  /**
   * Starts from a fresh aggregate with no history.
   *
   * @returns this fixture for chaining
   */
  givenNothing(): this {
    this.history = [];
    this.aggregate = this.factory();
    return this;
  }

  /**
   * Executes a behavior against the aggregate.
   *
   * @param action - behavior to execute (e.g. a command method call)
   * @returns this fixture for chaining
   */
  when(action: (aggregate: TAggregate) => void): this {
    action(this.requireAggregate());
    return this;
  }

  /**
   * Asserts the types of the uncommitted events, in order.
   *
   * @param eventTypes - expected event type names
   * @returns this fixture for chaining
   */
  expectEventTypes(...eventTypes: readonly string[]): this {
    const events = this.requireAggregate().getUncommittedEvents();
    expect(events.map((event) => event.eventType)).toEqual([...eventTypes]);
    return this;
  }

  /**
   * Asserts the number of uncommitted events.
   *
   * @param count - expected uncommitted event count
   * @returns this fixture for chaining
   */
  expectUncommittedCount(count: number): this {
    expect(this.requireAggregate().getUncommittedEvents()).toHaveLength(count);
    return this;
  }

  /**
   * Asserts that no uncommitted events exist.
   *
   * @returns this fixture for chaining
   */
  expectNoUncommittedEvents(): this {
    return this.expectUncommittedCount(0);
  }

  /**
   * Asserts the current aggregate version.
   *
   * @param version - expected version
   * @returns this fixture for chaining
   */
  expectVersion(version: number): this {
    expect(this.requireAggregate().version).toBe(version);
    return this;
  }

  /**
   * Asserts that a fresh instance rebuilt from the full event stream (given
   * history + uncommitted events) ends in the same state as the current
   * instance (replay determinism, Playbook 9.5).
   *
   * @param compare - assertion comparing rebuilt vs current aggregate
   * @returns this fixture for chaining
   */
  expectRebuildMatches(compare: (rebuilt: TAggregate, current: TAggregate) => void): this {
    const current = this.requireAggregate();
    const rebuilt = this.factory();
    rebuilt.loadFromHistory([...this.history, ...current.getUncommittedEvents()]);
    compare(rebuilt, current);
    return this;
  }

  /**
   * Runs a custom assertion over the uncommitted events.
   *
   * @param assertion - assertion receiving the uncommitted events
   * @returns this fixture for chaining
   */
  expectEvents(assertion: (events: readonly DomainEvent[]) => void): this {
    assertion(this.requireAggregate().getUncommittedEvents());
    return this;
  }

  /**
   * Returns the aggregate under test.
   *
   * @returns the aggregate
   */
  getAggregate(): TAggregate {
    return this.requireAggregate();
  }

  private requireAggregate(): TAggregate {
    if (this.aggregate === undefined) {
      throw new Error('AggregateFixture: call given() or givenNothing() first');
    }
    return this.aggregate;
  }
}

/**
 * Creates an {@link AggregateFixture} for an aggregate factory.
 *
 * @typeParam TAggregate - aggregate root type under test
 * @typeParam TId - identifier type of the aggregate
 * @param factory - creates a fresh aggregate instance
 * @returns the fixture
 */
export function aggregateFixture<TAggregate extends AggregateRoot<TId>, TId>(
  factory: () => TAggregate,
): AggregateFixture<TAggregate, TId> {
  return new AggregateFixture(factory);
}
