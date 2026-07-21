import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';


import { InMemoryDeadLetterQueue } from './dead-letter';

import type { DeadLetterEntry } from './dead-letter';
import type { CorrelationId } from '@relcko/types';

const entry = (consumerGroup: string): DeadLetterEntry => ({
  envelope: createEnvelope('Counter', 'id-1', 'CounterIncremented', { amount: 1 }, crypto.randomUUID() as CorrelationId),
  consumerGroup,
  error: { message: 'boom', code: 'BOOM' },
  attempts: 3,
  failedAt: 123,
});

describe('InMemoryDeadLetterQueue', () => {
  it('should_add_list_size_and_clear_entries', async () => {
    const queue = new InMemoryDeadLetterQueue();

    await queue.add(entry('group-a'));
    await queue.add(entry('group-b'));

    expect(await queue.size()).toBe(2);
    const entries = await queue.list();
    expect(entries.map((item) => item.consumerGroup)).toEqual(['group-a', 'group-b']);
    expect(entries[0]?.error.message).toBe('boom');

    await queue.clear();
    expect(await queue.size()).toBe(0);
  });
});
