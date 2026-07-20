import type { OutboxMessage } from './outbox-message';
import type { EventBus } from '@relcko/events';

/**
 * Transport port used by the outbox processor to deliver messages.
 */
export interface OutboxPublisher {
  /**
   * Delivers one outbox message to the transport.
   *
   * @param message - message to deliver
   * @throws any transport error; the processor records it as an attempt
   */
  publish(message: OutboxMessage): Promise<void>;
}

/**
 * {@link OutboxPublisher} delivering envelopes through an event bus.
 */
export class EventBusOutboxPublisher implements OutboxPublisher {
  private readonly eventBus: EventBus;

  /**
   * @param eventBus - event bus used as the transport
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  publish(message: OutboxMessage): Promise<void> {
    return this.eventBus.publish(message.envelope);
  }
}
