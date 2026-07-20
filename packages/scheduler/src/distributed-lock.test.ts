import { describe, expect, it } from 'vitest';

import { InMemoryDistributedLock } from './distributed-lock';

import type { Clock } from '@relcko/kernel';

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

describe('InMemoryDistributedLock', () => {
  it('should_grant_exclusive_access_until_release', async () => {
    const lock = new InMemoryDistributedLock(new FixedClock(0));

    const first = await lock.acquire('resource', 1000);
    expect(first).not.toBeNull();

    expect(await lock.acquire('resource', 1000)).toBeNull();

    await first?.release();
    expect(await lock.acquire('resource', 1000)).not.toBeNull();
  });

  it('should_grant_the_lock_after_expiry', async () => {
    const clock = new FixedClock(0);
    const lock = new InMemoryDistributedLock(clock);

    const first = await lock.acquire('resource', 1000);
    expect(first).not.toBeNull();

    clock.advance(1001);

    const second = await lock.acquire('resource', 1000);
    expect(second).not.toBeNull();
    expect(second?.token).not.toBe(first?.token);
  });

  it('should_not_unlock_a_reacquired_lock_when_a_stale_handle_releases', async () => {
    const clock = new FixedClock(0);
    const lock = new InMemoryDistributedLock(clock);

    const stale = await lock.acquire('resource', 1000);
    clock.advance(1001);
    const current = await lock.acquire('resource', 1000);

    await stale?.release();

    expect(await lock.acquire('resource', 1000)).toBeNull();
    await current?.release();
    expect(await lock.acquire('resource', 1000)).not.toBeNull();
  });

  it('should_lock_keys_independently', async () => {
    const lock = new InMemoryDistributedLock(new FixedClock(0));

    expect(await lock.acquire('a', 1000)).not.toBeNull();
    expect(await lock.acquire('b', 1000)).not.toBeNull();
  });
});
