import type { DomainEvent } from '@relcko/kernel';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: readonly DomainEvent[]): Promise<void>;
}
