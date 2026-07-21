import { DomainEvent } from '@relcko/kernel';
import { describe, expect, it, vi } from 'vitest';

import { NoOpDomainEventDispatcher, PublisherDomainEventDispatcher } from './domain-event-dispatcher';

import type { EventPublisher } from './event-publisher';
import type { EventId } from '@relcko/types';

class TestEvent extends DomainEvent {
  readonly eventType = 'test.event';
  constructor(aggregateId: string) {
    super({
      eventId: crypto.randomUUID() as EventId,
      aggregateId,
      aggregateType: 'test',
      aggregateVersion: 1,
      occurredAt: new Date(),
    });
  }
}

describe('NoOpDomainEventDispatcher', () => {
  it('does nothing when dispatching events', async () => {
    const dispatcher = new NoOpDomainEventDispatcher();
    const event = new TestEvent('agg-1');
    await expect(dispatcher.dispatch([event])).resolves.toBeUndefined();
  });

  it('handles empty event list', async () => {
    const dispatcher = new NoOpDomainEventDispatcher();
    await expect(dispatcher.dispatch([])).resolves.toBeUndefined();
  });
});

describe('PublisherDomainEventDispatcher', () => {
  it('forwards events to all registered publishers', async () => {
    const publishMany1 = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>();
    const publishMany2 = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>();
    const publisher1: EventPublisher = { publish: vi.fn(), publishMany: publishMany1 };
    const publisher2: EventPublisher = { publish: vi.fn(), publishMany: publishMany2 };
    const dispatcher = new PublisherDomainEventDispatcher([publisher1, publisher2]);

    const event = new TestEvent('agg-1');
    await dispatcher.dispatch([event]);

    expect(publishMany1).toHaveBeenCalledWith([event]);
    expect(publishMany2).toHaveBeenCalledWith([event]);
  });

  it('handles empty event list without calling publishers', async () => {
    const publishMany = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>();
    const publisher: EventPublisher = { publish: vi.fn(), publishMany };
    const dispatcher = new PublisherDomainEventDispatcher([publisher]);
    await dispatcher.dispatch([]);
    expect(publishMany).not.toHaveBeenCalled();
  });

  it('supports adding publishers after construction', async () => {
    const publishMany1 = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>();
    const publishMany2 = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>();
    const publisher1: EventPublisher = { publish: vi.fn(), publishMany: publishMany1 };
    const publisher2: EventPublisher = { publish: vi.fn(), publishMany: publishMany2 };
    const dispatcher = new PublisherDomainEventDispatcher([publisher1]);
    dispatcher.addPublisher(publisher2);

    const event = new TestEvent('agg-1');
    await dispatcher.dispatch([event]);

    expect(publishMany1).toHaveBeenCalledWith([event]);
    expect(publishMany2).toHaveBeenCalledWith([event]);
  });

  it('propagates publisher errors', async () => {
    const publishMany = vi.fn<(events: readonly DomainEvent[]) => Promise<void>>()
      .mockRejectedValue(new Error('publish failed'));
    const failingPublisher: EventPublisher = { publish: vi.fn(), publishMany };
    const dispatcher = new PublisherDomainEventDispatcher([failingPublisher]);
    const event = new TestEvent('agg-1');
    await expect(dispatcher.dispatch([event])).rejects.toThrow('publish failed');
  });
});
