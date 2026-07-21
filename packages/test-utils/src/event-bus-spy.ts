import { InMemoryEventBus } from '@relcko/event-bus';

import type { InMemoryEventBusOptions } from '@relcko/event-bus';
import type {
  EventBus,
  EventHandler,
  EventEnvelope,
  SubscribeOptions,
  Subscription,
} from '@relcko/events';

/**
 * Event bus test double: a fully functional {@link InMemoryEventBus} that
 * additionally records every published envelope for assertions.
 */
export class EventBusSpy implements EventBus {
  private readonly inner: InMemoryEventBus;
  private readonly recorded: EventEnvelope[] = [];

  /**
   * @param options - forwarded to the underlying in-memory bus
   */
  constructor(options?: InMemoryEventBusOptions) {
    this.inner = new InMemoryEventBus(options);
  }

  /**
   * Records and publishes one envelope.
   *
   * @param envelope - envelope to publish
   */
  async publish<TPayload>(envelope: EventEnvelope<TPayload>): Promise<void> {
    this.recorded.push(envelope);
    await this.inner.publish(envelope);
  }

  async publishMany<TPayload>(envelopes: readonly EventEnvelope<TPayload>[]): Promise<void> {
    for (const envelope of envelopes) {
      await this.publish(envelope);
    }
  }

  subscribe<TPayload>(handler: EventHandler<TPayload>, options?: SubscribeOptions): Subscription {
    return this.inner.subscribe(handler, options);
  }

  /**
   * Returns every published envelope in publish order.
   *
   * @returns copy of the recorded envelopes
   */
  published(): readonly EventEnvelope[] {
    return [...this.recorded];
  }

  /**
   * Counts published envelopes, optionally filtered by event type.
   *
   * @param eventType - optional event type filter
   * @returns number of matching envelopes
   */
  publishedCount(eventType?: string): number {
    if (eventType === undefined) {
      return this.recorded.length;
    }
    return this.recorded.filter((envelope) => envelope.metadata.eventType === eventType).length;
  }

  /**
   * Returns the most recently published envelope of a type.
   *
   * @param eventType - optional event type filter
   * @returns the last matching envelope, or undefined
   */
  lastPublished(eventType?: string): EventEnvelope | undefined {
    for (let index = this.recorded.length - 1; index >= 0; index -= 1) {
      const envelope = this.recorded[index];
      if (envelope !== undefined && (eventType === undefined || envelope.metadata.eventType === eventType)) {
        return envelope;
      }
    }
    return undefined;
  }

  /** Clears the recorded envelopes. */
  clear(): void {
    this.recorded.length = 0;
  }
}
