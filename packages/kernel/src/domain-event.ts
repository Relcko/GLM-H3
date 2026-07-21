import type { EventId } from '@relcko/types';

export interface DomainEventProps {
  readonly eventId: EventId;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly aggregateVersion: number;
  readonly schemaVersion?: number;
  readonly occurredAt: Date;
}

export abstract class DomainEvent {
  public readonly eventId: EventId;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly aggregateVersion: number;
  public readonly schemaVersion: number;
  public readonly occurredAt: Date;
  public abstract readonly eventType: string;

  protected constructor(props: DomainEventProps) {
    this.eventId = props.eventId;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.aggregateVersion = props.aggregateVersion;
    this.schemaVersion = props.schemaVersion ?? 1;
    this.occurredAt = props.occurredAt;
  }
}
