import { systemClock } from '@relcko/kernel';

import type { EventEnvelope } from '@relcko/events';
import type { Clock } from '@relcko/kernel';

export interface IdempotencyStore {
  claim(key: string): Promise<boolean>;
  complete(key: string): Promise<void>;
  fail(key: string): Promise<void>;
}

export function idempotencyKey(envelope: EventEnvelope, consumerGroup: string): string {
  return `${consumerGroup}:${envelope.metadata.eventId}`;
}

export interface InMemoryIdempotencyStoreOptions {
  readonly ttlMs?: number;
  readonly clock?: Clock;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, { state: 'in_flight' | 'processed'; addedAt: number }>();
  private readonly ttlMs: number;
  private readonly clock: Clock;

  constructor(options?: InMemoryIdempotencyStoreOptions) {
    this.ttlMs = options?.ttlMs ?? Infinity;
    this.clock = options?.clock ?? systemClock;
  }

  claim(key: string): Promise<boolean> {
    this.prune();
    if (this.store.has(key)) {
      return Promise.resolve(false);
    }
    this.store.set(key, { state: 'in_flight', addedAt: this.clock.nowMs() });
    return Promise.resolve(true);
  }

  complete(key: string): Promise<void> {
    const entry = this.store.get(key);
    if (entry?.state === 'in_flight') {
      entry.state = 'processed';
    }
    return Promise.resolve();
  }

  fail(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  size(): number {
    this.prune();
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  private prune(): void {
    if (this.ttlMs === Infinity) {
      return;
    }
    const cutoff = this.clock.nowMs() - this.ttlMs;
    for (const [key, entry] of this.store) {
      if (entry.addedAt <= cutoff) {
        this.store.delete(key);
      }
    }
  }
}
