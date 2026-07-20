import { NoOpLogger } from '@relcko/logger';
import { CorrelationScope, correlationScope } from '@relcko/telemetry';

import { InMemoryDeadLetterQueue } from './dead-letter';
import { InMemoryIdempotencyStore, idempotencyKey } from './idempotency';
import { NoRetryPolicy } from './retry-policy';

import type { DeadLetterQueue } from './dead-letter';
import type { IdempotencyStore } from './idempotency';
import type { EventBusMiddleware, EventDispatch } from './middleware';
import type { RetryPolicy } from './retry-policy';
import type { EventBus, EventHandler, SubscribeOptions, Subscription } from '@relcko/events';
import type { EventEnvelope } from '@relcko/events';
import type { Logger } from '@relcko/logger';

export interface InMemoryEventBusOptions {
  readonly logger?: Logger;
  readonly retryPolicy?: RetryPolicy;
  readonly deadLetterQueue?: DeadLetterQueue;
  readonly idempotencyStore?: IdempotencyStore;
  readonly correlationScope?: CorrelationScope;
  readonly sleep?: (ms: number) => Promise<void>;
}

interface SubscriberEntry {
  readonly id: number;
  readonly handler: EventHandler;
  readonly eventType?: string;
  readonly aggregateType?: string;
  readonly consumerGroup: string;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class InMemoryEventBus implements EventBus {
  private subscribers: SubscriberEntry[] = [];
  private nextSubscriberId = 1;
  private readonly middlewares: EventBusMiddleware[] = [];
  private readonly logger: Logger;
  private readonly retryPolicy: RetryPolicy;
  private readonly deadLetterQueue: DeadLetterQueue;
  private readonly idempotencyStore: IdempotencyStore;
  private readonly correlation: CorrelationScope;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options?: InMemoryEventBusOptions) {
    this.logger = (options?.logger ?? new NoOpLogger()).child('InMemoryEventBus');
    this.retryPolicy = options?.retryPolicy ?? new NoRetryPolicy();
    this.deadLetterQueue = options?.deadLetterQueue ?? new InMemoryDeadLetterQueue();
    this.idempotencyStore = options?.idempotencyStore ?? new InMemoryIdempotencyStore();
    this.correlation = options?.correlationScope ?? correlationScope;
    this.sleep = options?.sleep ?? defaultSleep;
  }

  use(middleware: EventBusMiddleware): void {
    this.middlewares.push(middleware);
  }

  subscriberCount(): number {
    return this.subscribers.length;
  }

  subscribe<TPayload>(handler: EventHandler<TPayload>, options?: SubscribeOptions): Subscription {
    const entry: SubscriberEntry = {
      id: this.nextSubscriberId,
      handler: handler as unknown as EventHandler,
      eventType: options?.eventType,
      aggregateType: options?.aggregateType,
      consumerGroup: options?.consumerGroup ?? `anonymous-${this.nextSubscriberId}`,
    };
    this.nextSubscriberId += 1;
    this.subscribers.push(entry);
    return {
      unsubscribe: () => {
        this.subscribers = this.subscribers.filter((subscriber) => subscriber.id !== entry.id);
      },
    };
  }

  async publish<TPayload>(envelope: EventEnvelope<TPayload>): Promise<void> {
    const targets = this.subscribers.filter((subscriber) => matches(subscriber, envelope));
    await Promise.all(
      targets.map(async (subscriber) =>
        this.dispatch(subscriber, envelope as unknown as EventEnvelope),
      ),
    );
  }

  async publishMany<TPayload>(envelopes: readonly EventEnvelope<TPayload>[]): Promise<void> {
    for (const envelope of envelopes) {
      await this.publish(envelope);
    }
  }

  private async dispatch(subscriber: SubscriberEntry, envelope: EventEnvelope): Promise<void> {
    const key = idempotencyKey(envelope, subscriber.consumerGroup);
    if (!(await this.idempotencyStore.claim(key))) {
      this.logger.debug('Skipping already claimed or processed event', {
        eventId: envelope.metadata.eventId,
        eventType: envelope.metadata.eventType,
        consumerGroup: subscriber.consumerGroup,
      });
      return;
    }
    await this.correlation.run(
      { correlationId: envelope.metadata.correlationId, causationId: envelope.metadata.eventId },
      () => this.dispatchWithRetry(subscriber, envelope, key),
    );
  }

  private async dispatchWithRetry(
    subscriber: SubscriberEntry,
    envelope: EventEnvelope,
    key: string,
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt += 1) {
      try {
        await this.runPipeline(subscriber, envelope);
        await this.idempotencyStore.complete(key);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < this.retryPolicy.maxAttempts && this.retryPolicy.shouldRetry(attempt, error)) {
          this.logger.warn('Event handler failed, scheduling retry', {
            eventId: envelope.metadata.eventId,
            eventType: envelope.metadata.eventType,
            consumerGroup: subscriber.consumerGroup,
            attempt,
          });
          await this.sleep(this.retryPolicy.delayMs(attempt));
          continue;
        }
        break;
      }
    }
    await this.idempotencyStore.fail(key);
    await this.deadLetter(subscriber, envelope, lastError, this.retryPolicy.maxAttempts);
  }

  private runPipeline(subscriber: SubscriberEntry, envelope: EventEnvelope): Promise<void> {
    const dispatch: EventDispatch = { envelope, consumerGroup: subscriber.consumerGroup };
    const terminal = (): Promise<void> => subscriber.handler(envelope);
    const pipeline = this.middlewares.reduceRight<() => Promise<void>>(
      (next, middleware) => () => middleware(dispatch, next),
      terminal,
    );
    return pipeline();
  }

  private async deadLetter(
    subscriber: SubscriberEntry,
    envelope: EventEnvelope,
    error: unknown,
    attempts: number,
  ): Promise<void> {
    const failure = error instanceof Error ? error : new Error(String(error));
    this.logger.error(
      'Event handler exhausted retries; dispatch sent to dead-letter queue',
      failure,
      {
        eventId: envelope.metadata.eventId,
        eventType: envelope.metadata.eventType,
        consumerGroup: subscriber.consumerGroup,
        attempts,
      },
    );
    await this.deadLetterQueue.add({
      envelope,
      consumerGroup: subscriber.consumerGroup,
      error: {
        message: failure.message,
        code: (failure as { code?: string }).code,
        stack: failure.stack,
      },
      attempts,
      failedAt: Date.now(),
    });
  }
}

function matches(subscriber: SubscriberEntry, envelope: EventEnvelope): boolean {
  if (subscriber.eventType !== undefined && subscriber.eventType !== envelope.metadata.eventType) {
    return false;
  }
  if (
    subscriber.aggregateType !== undefined &&
    subscriber.aggregateType !== envelope.metadata.aggregateType
  ) {
    return false;
  }
  return true;
}
