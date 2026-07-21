import type { EventEnvelope } from './envelope';

export interface SubscribeOptions {
  readonly eventType?: string;
  readonly aggregateType?: string;
  readonly consumerGroup?: string;
}

export interface Subscription {
  readonly unsubscribe: () => void;
}

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>,
) => Promise<void>;

export interface EventBus {
  publish<TPayload>(envelope: EventEnvelope<TPayload>): Promise<void>;
  publishMany<TPayload>(envelopes: readonly EventEnvelope<TPayload>[]): Promise<void>;
  subscribe<TPayload>(
    handler: EventHandler<TPayload>,
    options?: SubscribeOptions,
  ): Subscription;
}
