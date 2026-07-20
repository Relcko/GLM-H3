import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';


import { EventBusSpy } from './event-bus-spy';

import type { CorrelationId } from '@relcko/types';

const envelope = (type: string) =>
  createEnvelope('Counter', 'counter-1', type, { v: 1 }, crypto.randomUUID() as CorrelationId);

describe('EventBusSpy', () => {
  it('should_record_published_envelopes_and_delegate_to_subscribers', async () => {
    const bus = new EventBusSpy();
    const received: string[] = [];
    bus.subscribe((event) => {
      received.push(event.metadata.eventType);
      return Promise.resolve();
    });

    await bus.publish(envelope('First'));
    await bus.publishMany([envelope('Second'), envelope('Third')]);

    expect(bus.publishedCount()).toBe(3);
    expect(bus.publishedCount('Second')).toBe(1);
    expect(bus.lastPublished()?.metadata.eventType).toBe('Third');
    expect(bus.lastPublished('First')?.metadata.eventType).toBe('First');
    expect(received).toEqual(['First', 'Second', 'Third']);
  });

  it('clear_should_reset_the_recording', async () => {
    const bus = new EventBusSpy();
    await bus.publish(envelope('First'));

    bus.clear();

    expect(bus.published()).toHaveLength(0);
    expect(bus.lastPublished()).toBeUndefined();
  });
});
