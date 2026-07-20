import { InvariantViolationError } from '@relcko/errors';

import { Entity } from './entity';

import type { DomainEvent } from './domain-event';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _version = 0;
  private readonly _uncommittedEvents: DomainEvent[] = [];

  public get version(): number {
    return this._version;
  }

  public abstract readonly aggregateType: string;

  protected abstract when(event: DomainEvent): void;

  public getUncommittedEvents(): readonly DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  public markEventsAsCommitted(): void {
    this._uncommittedEvents.length = 0;
  }

  public loadFromHistory(history: readonly DomainEvent[]): void {
    if (history.length === 0) return;

    for (let i = 0; i < history.length; i += 1) {
      const event = history[i];
      if (event === undefined) continue;

      if (event.aggregateId !== String(this.id)) {
        throw new InvariantViolationError(
          this.aggregateType,
          String(this.id),
          'replay-aggregate-id-mismatch',
          { eventAggregateId: event.aggregateId, eventIndex: i, eventType: event.eventType },
        );
      }

      if (event.aggregateVersion !== i + 1) {
        throw new InvariantViolationError(
          this.aggregateType,
          String(this.id),
          'replay-version-ordering',
          {
            expectedVersion: i + 1,
            actualVersion: event.aggregateVersion,
            eventIndex: i,
            eventType: event.eventType,
          },
        );
      }

      this.when(event);
      this._version = event.aggregateVersion;
    }

    this.markEventsAsCommitted();
  }

  protected nextVersion(): number {
    return this._version + 1;
  }

  protected restoreVersion(version: number): void {
    this._version = version;
  }

  protected apply(event: DomainEvent): void {
    if (event.aggregateId !== String(this.id)) {
      throw new InvariantViolationError(
        this.aggregateType,
        String(this.id),
        'event-aggregate-id-mismatch',
        { eventAggregateId: event.aggregateId },
      );
    }
    if (event.aggregateVersion !== this.nextVersion()) {
      throw new InvariantViolationError(
        this.aggregateType,
        String(this.id),
        'event-version-sequence',
        { expectedVersion: this.nextVersion(), actualVersion: event.aggregateVersion },
      );
    }
    this.when(event);
    this._version = event.aggregateVersion;
    this._uncommittedEvents.push(event);
  }
}
