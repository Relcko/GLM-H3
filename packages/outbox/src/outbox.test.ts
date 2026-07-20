
import { NotFoundError } from '@relcko/errors';
import { InMemoryEventBus } from '@relcko/event-bus';
import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';

import { DeliveryStatus } from './delivery-status';
import { createOutboxMessage } from './outbox-message';
import { OutboxProcessor } from './outbox-processor';
import { EventBusOutboxPublisher } from './outbox-publisher';

import type { OutboxMessage } from './outbox-message';
import type { OutboxPublisher } from './outbox-publisher';
import type { OutboxRepository } from './outbox-repository';
import type { Clock } from '@relcko/kernel';
import type { CorrelationId } from '@relcko/types';

class FixedClock implements Clock {
  private current: number;

  constructor(start: number) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

class FakeOutboxRepository implements OutboxRepository {
  private readonly messages = new Map<string, OutboxMessage>();
  private readonly claimed = new Map<string, { instanceId: string; leasedUntil: number }>();
  private gate: Promise<void> | undefined;
  private clockNow = Date.now;

  setClock(clock: { nowMs: () => number }): void {
    this.clockNow = () => clock.nowMs();
  }

  hold(gate: Promise<void>): void {
    this.gate = gate;
  }

  get(id: string): OutboxMessage {
    const message = this.messages.get(id);
    if (message === undefined) {
      throw new NotFoundError('OutboxMessage', id);
    }
    return message;
  }

  all(): readonly OutboxMessage[] {
    return [...this.messages.values()];
  }

  save(message: OutboxMessage): Promise<void> {
    this.messages.set(message.id, message);
    return Promise.resolve();
  }

  async fetchPending(limit: number): Promise<readonly OutboxMessage[]> {
    if (this.gate !== undefined) {
      await this.gate;
    }
    return [...this.messages.values()]
      .filter(
        (message) =>
          message.status === DeliveryStatus.Pending && !this.claimed.has(message.id),
      )
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(0, limit);
  }

  markPublished(id: string, publishedAt: number): Promise<void> {
    const message = this.get(id);
    this.messages.set(id, { ...message, status: DeliveryStatus.Published, publishedAt });
    this.claimed.delete(id);
    return Promise.resolve();
  }

  recordAttempt(id: string, error: string, attemptedAt: number): Promise<void> {
    const message = this.get(id);
    this.messages.set(id, {
      ...message,
      attempts: message.attempts + 1,
      lastAttemptAt: attemptedAt,
      lastError: error,
    });
    return Promise.resolve();
  }

  markFailed(id: string, error: string, failedAt: number): Promise<void> {
    const message = this.get(id);
    this.messages.set(id, {
      ...message,
      status: DeliveryStatus.Failed,
      attempts: message.attempts + 1,
      lastAttemptAt: failedAt,
      lastError: error,
    });
    this.claimed.delete(id);
    return Promise.resolve();
  }

  claimPending(limit: number, instanceId: string, leaseTtlMs: number): Promise<readonly OutboxMessage[]> {
    const now = this.clockNow();
    const expired: string[] = [];
    for (const [id, claim] of this.claimed) {
      if (claim.leasedUntil <= now) {
        expired.push(id);
      }
    }
    for (const id of expired) {
      this.claimed.delete(id);
    }
    const result = [...this.messages.values()]
      .filter(
        (message) =>
          message.status === DeliveryStatus.Pending && !this.claimed.has(message.id),
      )
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(0, limit)
      .map((message) => {
        this.claimed.set(message.id, { instanceId, leasedUntil: now + leaseTtlMs });
        return message;
      });
    return Promise.resolve(result);
  }

  releaseClaim(id: string): Promise<void> {
    this.get(id);
    this.claimed.delete(id);
    return Promise.resolve();
  }

  heartbeatClaim(id: string, _instanceId: string): Promise<void> {
    const claim = this.claimed.get(id);
    if (claim === undefined) {
      return Promise.resolve();
    }
    this.claimed.set(id, { ...claim, leasedUntil: this.clockNow() + 30_000 });
    return Promise.resolve();
  }
}

class StubPublisher implements OutboxPublisher {
  readonly published: OutboxMessage[] = [];
  failuresRemaining = 0;

  publish(message: OutboxMessage): Promise<void> {
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      return Promise.reject(new Error('broker unavailable'));
    }
    this.published.push(message);
    return Promise.resolve();
  }
}

const envelope = () =>
  createEnvelope('Counter', 'counter-1', 'CounterIncremented', { amount: 1 }, crypto.randomUUID() as CorrelationId);

describe('createOutboxMessage', () => {
  it('should_create_a_pending_message_with_defaults', () => {
    const message = createOutboxMessage(envelope());

    expect(message.id).toBeDefined();
    expect(message.status).toBe(DeliveryStatus.Pending);
    expect(message.attempts).toBe(0);
    expect(message.createdAt).toBeGreaterThan(0);
  });

  it('should_honor_overrides', () => {
    const message = createOutboxMessage(envelope(), { id: 'msg-1', createdAt: 42 });

    expect(message.id).toBe('msg-1');
    expect(message.createdAt).toBe(42);
  });
});

describe('EventBusOutboxPublisher', () => {
  it('should_publish_the_message_envelope_to_the_bus', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe((event) => {
      received.push(event.metadata.eventType);
      return Promise.resolve();
    });
    const publisher = new EventBusOutboxPublisher(bus);

    await publisher.publish(createOutboxMessage(envelope()));

    expect(received).toEqual(['CounterIncremented']);
  });
});

describe('OutboxProcessor', () => {
  it('processBatch_should_publish_pending_messages_in_creation_order', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    const processor = new OutboxProcessor({
      repository,
      publisher,
      clock: new FixedClock(1_000),
    });
    await repository.save(createOutboxMessage(envelope(), { id: 'm2', createdAt: 2 }));
    await repository.save(createOutboxMessage(envelope(), { id: 'm1', createdAt: 1 }));

    const result = await processor.processBatch();

    expect(result).toEqual({ fetched: 2, published: 2, retried: 0, failed: 0 });
    expect(publisher.published.map((message) => message.id)).toEqual(['m1', 'm2']);
    expect(repository.get('m1').status).toBe(DeliveryStatus.Published);
    expect(repository.get('m1').publishedAt).toBe(1_000);
  });

  it('processBatch_should_record_an_attempt_and_keep_pending_on_failure', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    publisher.failuresRemaining = 1;
    const processor = new OutboxProcessor({
      repository,
      publisher,
      clock: new FixedClock(5_000),
      maxAttempts: 3,
    });
    await repository.save(createOutboxMessage(envelope(), { id: 'm1', createdAt: 1 }));

    const result = await processor.processBatch();

    expect(result).toEqual({ fetched: 1, published: 0, retried: 1, failed: 0 });
    const message = repository.get('m1');
    expect(message.status).toBe(DeliveryStatus.Pending);
    expect(message.attempts).toBe(1);
    expect(message.lastError).toBe('broker unavailable');
    expect(message.lastAttemptAt).toBe(5_000);
  });

  it('processBatch_should_mark_failed_when_attempts_are_exhausted', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    publisher.failuresRemaining = 10;
    const processor = new OutboxProcessor({
      repository,
      publisher,
      clock: new FixedClock(0),
      maxAttempts: 2,
    });
    await repository.save(createOutboxMessage(envelope(), { id: 'm1', createdAt: 1 }));

    const first = await processor.processBatch();
    const second = await processor.processBatch();

    expect(first.retried).toBe(1);
    expect(second.failed).toBe(1);
    const message = repository.get('m1');
    expect(message.status).toBe(DeliveryStatus.Failed);
    expect(message.attempts).toBe(2);
  });

  it('processBatch_should_respect_the_batch_size', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    const processor = new OutboxProcessor({ repository, publisher, batchSize: 2 });
    for (let index = 0; index < 5; index += 1) {
      await repository.save(createOutboxMessage(envelope(), { id: `m${index}`, createdAt: index }));
    }

    const result = await processor.processBatch();

    expect(result.fetched).toBe(2);
    expect(publisher.published).toHaveLength(2);
  });

  it('processBatch_should_ignore_concurrent_invocations', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    const processor = new OutboxProcessor({ repository, publisher });
    await repository.save(createOutboxMessage(envelope(), { id: 'm1', createdAt: 1 }));

    let releaseGate: () => void = () => undefined;
    repository.hold(
      new Promise<void>((resolve) => {
        releaseGate = resolve;
      }),
    );
    const first = processor.processBatch();
    const second = await processor.processBatch();
    releaseGate();
    await first;

    expect(second).toEqual({ fetched: 0, published: 0, retried: 0, failed: 0 });
    expect(publisher.published).toHaveLength(1);
  });

  it('start_and_stop_should_drive_batches_from_a_timer', async () => {
    const repository = new FakeOutboxRepository();
    const publisher = new StubPublisher();
    const processor = new OutboxProcessor({ repository, publisher });
    await repository.save(createOutboxMessage(envelope(), { id: 'm1', createdAt: 1 }));

    processor.start(5);
    expect(processor.isRunning).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    processor.stop();

    expect(processor.isRunning).toBe(false);
    expect(repository.get('m1').status).toBe(DeliveryStatus.Published);
  });
});
