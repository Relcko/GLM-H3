import { createEnvelope } from '@relcko/events';
import { describe, expect, it } from 'vitest';


import { InMemoryIdempotencyStore, idempotencyKey } from './idempotency';

import type { CorrelationId } from '@relcko/types';

describe('idempotencyKey', () => {
  it('should_scope_the_event_id_per_consumer_group', () => {
    const envelope = createEnvelope('Counter', 'id-1', 'CounterIncremented', null, crypto.randomUUID() as CorrelationId);

    expect(idempotencyKey(envelope, 'group-a')).toBe(`group-a:${envelope.metadata.eventId}`);
    expect(idempotencyKey(envelope, 'group-b')).not.toBe(idempotencyKey(envelope, 'group-a'));
  });
});

describe('InMemoryIdempotencyStore', () => {
  it('claim_returns_true_for_new_key', async () => {
    const store = new InMemoryIdempotencyStore();

    expect(await store.claim('new-key')).toBe(true);
    expect(store.size()).toBe(1);
  });

  it('claim_returns_false_for_claimed_key', async () => {
    const store = new InMemoryIdempotencyStore();

    expect(await store.claim('k1')).toBe(true);
    expect(await store.claim('k1')).toBe(false);
  });

  it('complete_prevents_subsequent_claim', async () => {
    const store = new InMemoryIdempotencyStore();

    expect(await store.claim('k1')).toBe(true);
    await store.complete('k1');
    expect(await store.claim('k1')).toBe(false);
    expect(store.size()).toBe(1);
  });

  it('fail_releases_key_for_future_claim', async () => {
    const store = new InMemoryIdempotencyStore();

    expect(await store.claim('k1')).toBe(true);
    await store.fail('k1');
    expect(await store.claim('k1')).toBe(true);
    expect(store.size()).toBe(1);
  });

  it('complete_after_fail_is_noop', async () => {
    const store = new InMemoryIdempotencyStore();

    await store.claim('k1');
    await store.fail('k1');
    await expect(store.complete('k1')).resolves.toBeUndefined();
  });

  it('fail_after_complete_is_noop', async () => {
    const store = new InMemoryIdempotencyStore();

    await store.claim('k1');
    await store.complete('k1');
    await store.fail('k1');
    expect(await store.claim('k1')).toBe(true);
  });

  it('clear_removes_all_keys', async () => {
    const store = new InMemoryIdempotencyStore();

    await store.claim('k1');
    await store.claim('k2');
    expect(store.size()).toBe(2);
    store.clear();
    expect(store.size()).toBe(0);
    expect(await store.claim('k1')).toBe(true);
  });
});
