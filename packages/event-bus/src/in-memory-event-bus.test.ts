
import { createEnvelope } from '@relcko/events';
import { CorrelationScope } from '@relcko/telemetry';
import { describe, expect, it } from 'vitest';

import { InMemoryDeadLetterQueue } from './dead-letter';
import { InMemoryIdempotencyStore } from './idempotency';
import { InMemoryEventBus } from './in-memory-event-bus';
import { ExponentialBackoffRetryPolicy } from './retry-policy';

import type { EventEnvelope } from '@relcko/events';
import type { CorrelationId, EventId } from '@relcko/types';

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;

const envelope = (
  eventType: string,
  aggregateType = 'Counter',
  aggregateId = 'counter-1',
): EventEnvelope<Record<string, unknown>> =>
  createEnvelope(aggregateType, aggregateId, eventType, { value: 1 }, correlationId(), {
    producer: 'event-bus-test',
  });

const instantSleep = (): { sleep: (ms: number) => Promise<void>; delays: number[] } => {
  const delays: number[] = [];
  return {
    delays,
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
  };
};

describe('InMemoryEventBus', () => {
  it('publish_should_deliver_to_subscribers_matching_the_event_type', async () => {
    const bus = new InMemoryEventBus();
    const received: EventEnvelope[] = [];
    bus.subscribe(
      (event) => {
        received.push(event);
        return Promise.resolve();
      },
      { eventType: 'CounterIncremented' },
    );

    await bus.publish(envelope('CounterIncremented'));
    await bus.publish(envelope('CounterDecremented'));

    expect(received).toHaveLength(1);
    expect(received[0]?.metadata.eventType).toBe('CounterIncremented');
  });

  it('publish_should_deliver_to_subscribers_matching_the_aggregate_type', async () => {
    const bus = new InMemoryEventBus();
    const received: EventEnvelope[] = [];
    bus.subscribe(
      (event) => {
        received.push(event);
        return Promise.resolve();
      },
      { aggregateType: 'Order' },
    );

    await bus.publish(envelope('Anything', 'Order'));
    await bus.publish(envelope('Anything', 'Counter'));

    expect(received).toHaveLength(1);
  });

  it('publish_should_deliver_to_catch_all_subscribers', async () => {
    const bus = new InMemoryEventBus();
    const received: EventEnvelope[] = [];
    bus.subscribe((event) => {
      received.push(event);
      return Promise.resolve();
    });

    await bus.publish(envelope('One'));
    await bus.publish(envelope('Two'));

    expect(received).toHaveLength(2);
  });

  it('unsubscribe_should_stop_delivery', async () => {
    const bus = new InMemoryEventBus();
    const received: EventEnvelope[] = [];
    const subscription = bus.subscribe((event) => {
      received.push(event);
      return Promise.resolve();
    });

    await bus.publish(envelope('Before'));
    subscription.unsubscribe();
    await bus.publish(envelope('After'));

    expect(received).toHaveLength(1);
    expect(bus.subscriberCount()).toBe(0);
  });

  it('publishMany_should_dispatch_envelopes_sequentially_in_order', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe((event) => {
      received.push(event.metadata.eventType);
      return Promise.resolve();
    });

    await bus.publishMany([envelope('First'), envelope('Second'), envelope('Third')]);

    expect(received).toEqual(['First', 'Second', 'Third']);
  });

  it('middleware_should_wrap_handler_execution_in_registration_order', async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];
    bus.use(async (_dispatch, next) => {
      order.push('m1-before');
      await next();
      order.push('m1-after');
    });
    bus.use(async (_dispatch, next) => {
      order.push('m2-before');
      await next();
      order.push('m2-after');
    });
    bus.subscribe(() => {
      order.push('handler');
      return Promise.resolve();
    });

    await bus.publish(envelope('Any'));

    expect(order).toEqual(['m1-before', 'm2-before', 'handler', 'm2-after', 'm1-after']);
  });

  it('middleware_should_short_circuit_when_next_is_not_called', async () => {
    const bus = new InMemoryEventBus();
    let handled = 0;
    bus.use(() => Promise.resolve());
    bus.subscribe(() => {
      handled += 1;
      return Promise.resolve();
    });

    await bus.publish(envelope('Any'));

    expect(handled).toBe(0);
  });

  it('should_retry_a_failing_handler_until_it_succeeds', async () => {
    const { sleep, delays } = instantSleep();
    const bus = new InMemoryEventBus({
      retryPolicy: new ExponentialBackoffRetryPolicy({ maxAttempts: 3, baseDelayMs: 50 }),
      sleep,
    });
    let calls = 0;
    bus.subscribe(
      () => {
        calls += 1;
        return calls < 3 ? Promise.reject(new Error('transient')) : Promise.resolve();
      },
      { consumerGroup: 'workers' },
    );

    await bus.publish(envelope('Flaky'));

    expect(calls).toBe(3);
    expect(delays).toEqual([50, 100]);
  });

  it('should_dead_letter_after_exhausting_retries_without_failing_publish', async () => {
      const { sleep } = instantSleep();
      const deadLetterQueue = new InMemoryDeadLetterQueue();
      const bus = new InMemoryEventBus({
        retryPolicy: new ExponentialBackoffRetryPolicy({ maxAttempts: 2, baseDelayMs: 10 }),
        deadLetterQueue,
        sleep,
      });
      let calls = 0;
      bus.subscribe(
        () => {
          calls += 1;
          return Promise.reject(new Error('permanent'));
        },
        { consumerGroup: 'workers' },
      );

      await bus.publish(envelope('Doomed'));

      expect(calls).toBe(2);
      expect(await deadLetterQueue.size()).toBe(1);
      const entries = await deadLetterQueue.list();
      expect(entries[0]?.consumerGroup).toBe('workers');
      expect(entries[0]?.error.message).toBe('permanent');
      expect(entries[0]?.attempts).toBe(2);
      expect(entries[0]?.envelope.metadata.eventType).toBe('Doomed');
  });

  it('should_skip_duplicate_deliveries_for_the_same_consumer_group', async () => {
    const bus = new InMemoryEventBus();
    let calls = 0;
    bus.subscribe(
      () => {
        calls += 1;
        return Promise.resolve();
      },
      { consumerGroup: 'workers' },
    );
    const event = envelope('CounterIncremented');

    await bus.publish(event);
    await bus.publish(event);

    expect(calls).toBe(1);
  });

  it('should_deliver_once_per_consumer_group_for_the_same_event', async () => {
    const bus = new InMemoryEventBus();
    let callsA = 0;
    let callsB = 0;
    bus.subscribe(
      () => {
        callsA += 1;
        return Promise.resolve();
      },
      { consumerGroup: 'group-a' },
    );
    bus.subscribe(
      () => {
        callsB += 1;
        return Promise.resolve();
      },
      { consumerGroup: 'group-b' },
    );
    const event = envelope('CounterIncremented');

    await bus.publish(event);
    await bus.publish(event);

    expect(callsA).toBe(1);
    expect(callsB).toBe(1);
  });

  it('should_isolate_failures_between_subscribers', async () => {
    const deadLetterQueue = new InMemoryDeadLetterQueue();
    const bus = new InMemoryEventBus({ deadLetterQueue });
    let healthyCalls = 0;
    bus.subscribe(
      () => Promise.reject(new Error('broken')),
      { consumerGroup: 'broken-group' },
    );
    bus.subscribe(
      () => {
        healthyCalls += 1;
        return Promise.resolve();
      },
      { consumerGroup: 'healthy-group' },
    );

    await bus.publish(envelope('Any'));

    expect(healthyCalls).toBe(1);
    expect(await deadLetterQueue.size()).toBe(1);
  });

  it('should_propagate_the_envelope_correlation_context_into_the_handler', async () => {
    const scope = new CorrelationScope();
    const bus = new InMemoryEventBus({ correlationScope: scope });
    let observedCorrelation: CorrelationId | undefined;
    let observedCausation: EventId | undefined;
    bus.subscribe(() => {
      observedCorrelation = scope.currentCorrelationId();
      observedCausation = scope.current()?.causationId;
      return Promise.resolve();
    });
    const event = envelope('CounterIncremented');

    await bus.publish(event);

    expect(observedCorrelation).toBe(event.metadata.correlationId);
    expect(observedCausation).toBe(event.metadata.eventId);
    expect(scope.current()).toBeUndefined();
  });

  describe('idempotency lifecycle', () => {
    it('concurrent_publish_should_execute_handler_only_once', async () => {
      const bus = new InMemoryEventBus();
      let calls = 0;
      bus.subscribe(
        () => {
          calls += 1;
          return Promise.resolve();
        },
        { consumerGroup: 'concurrent-test' },
      );
      const event = envelope('Concurrent');

      await Promise.all([bus.publish(event), bus.publish(event)]);

      expect(calls).toBe(1);
    });

    it('processing_failure_should_release_key_via_fail', async () => {
      const bus = new InMemoryEventBus({
        retryPolicy: new ExponentialBackoffRetryPolicy({ maxAttempts: 1, baseDelayMs: 10 }),
      });
      let calls = 0;
      bus.subscribe(
        () => {
          calls += 1;
          return Promise.reject(new Error('fail'));
        },
        { consumerGroup: 'failure-test' },
      );
      const event = envelope('FailureEvent');

      await bus.publish(event);

      expect(calls).toBe(1);

      await bus.publish(event);

      expect(calls).toBe(2);
    });

    it('success_path_should_complete_key_and_skip_future_duplicates', async () => {
      const bus = new InMemoryEventBus();
      let calls = 0;
      bus.subscribe(
        () => {
          calls += 1;
          return Promise.resolve();
        },
        { consumerGroup: 'success-test' },
      );
      const event = envelope('SuccessPath');

      await bus.publish(event);

      expect(calls).toBe(1);

      await bus.publish(event);

      expect(calls).toBe(1);
    });

    it('crash_after_claim_should_not_permanently_suppress_delivery', async () => {
      const store = new InMemoryIdempotencyStore();
      const bus = new InMemoryEventBus({ idempotencyStore: store });
      let calls = 0;
      bus.subscribe(
        () => {
          calls += 1;
          return Promise.resolve();
        },
        { consumerGroup: 'crash-test' },
      );
      const event = envelope('CrashRecovery');
      const key = `crash-test:${event.metadata.eventId}`;

      await store.claim(key);

      await bus.publish(event);

      expect(calls).toBe(0);

      await store.fail(key);

      await bus.publish(event);

      expect(calls).toBe(1);
    });
  });
});
