import type { EventPublisher } from './event-publisher';
import type { DomainEvent } from '@relcko/kernel';

export interface DomainEventDispatcher {
  dispatch(events: readonly DomainEvent[]): Promise<void>;
}

export class NoOpDomainEventDispatcher implements DomainEventDispatcher {
  dispatch(_events: readonly DomainEvent[]): Promise<void> {
    return Promise.resolve();
  }
}

export class PublisherDomainEventDispatcher implements DomainEventDispatcher {
  private readonly publishers: EventPublisher[];

  constructor(publishers: readonly EventPublisher[]) {
    this.publishers = [...publishers];
  }

  addPublisher(publisher: EventPublisher): void {
    this.publishers.push(publisher);
  }

  async dispatch(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    for (const publisher of this.publishers) {
      await publisher.publishMany(events);
    }
  }
}
