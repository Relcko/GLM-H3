import { systemClock } from '@relcko/kernel';

import type { EventEnvelope } from '@relcko/events';
import type { Clock } from '@relcko/kernel';

/** Serializable description of the failure that exhausted retries. */
export interface DeadLetterError {
  /** Error message. */
  readonly message: string;
  /** Domain error code, when the failure was a DomainError. */
  readonly code?: string;
  /** Stack trace, when available. */
  readonly stack?: string;
}

/**
 * A dispatch that exhausted its retry policy.
 */
export interface DeadLetterEntry {
  /** Envelope that could not be processed. */
  readonly envelope: EventEnvelope;
  /** Consumer group whose handler failed. */
  readonly consumerGroup: string;
  /** Description of the terminal failure. */
  readonly error: DeadLetterError;
  /** Number of attempts made before giving up. */
  readonly attempts: number;
  /** Epoch milliseconds of the final failure. */
  readonly failedAt: number;
}

/**
 * Dead-letter abstraction (Playbook 6.2 - alert on exhaustion).
 *
 * Entries require manual or tooling-driven inspection and reprocessing;
 * nothing here is automatic.
 */
export interface DeadLetterQueue {
  /**
   * Appends an entry to the queue.
   *
   * @param entry - failed dispatch entry
   */
  add(entry: DeadLetterEntry): Promise<void>;

  /**
   * Lists all queued entries in insertion order.
   *
   * @returns copy of the queued entries
   */
  list(): Promise<readonly DeadLetterEntry[]>;

  /**
   * Returns the number of queued entries.
   *
   * @returns queue depth
   */
  size(): Promise<number>;

  /** Removes all queued entries. */
  clear(): Promise<void>;
}

/** Options accepted by {@link InMemoryDeadLetterQueue}. */
export interface InMemoryDeadLetterQueueOptions {
  /** Maximum entries before oldest are evicted. Defaults to unlimited. */
  readonly maxSize?: number;
  /** Entries older than this many milliseconds are pruned on access. Defaults to unlimited. */
  readonly ttlMs?: number;
  /** Clock used for TTL evaluation. Defaults to the system clock. */
  readonly clock?: Clock;
}

/**
 * In-process {@link DeadLetterQueue} with optional TTL and size bounds.
 *
 * Suitable for development, tests, and as the default until a durable
 * implementation is wired in. Single-process only: entries are lost on
 * restart and not shared across instances.
 */
export class InMemoryDeadLetterQueue implements DeadLetterQueue {
  private entries: { entry: DeadLetterEntry; addedAt: number }[] = [];
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly clock: Clock;

  /**
   * @param options - optional size and TTL limits
   */
  constructor(options?: InMemoryDeadLetterQueueOptions) {
    this.maxSize = options?.maxSize ?? Infinity;
    this.ttlMs = options?.ttlMs ?? Infinity;
    this.clock = options?.clock ?? systemClock;
  }

  add(entry: DeadLetterEntry): Promise<void> {
    this.prune();
    this.entries.push({ entry, addedAt: this.clock.nowMs() });
    while (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
    return Promise.resolve();
  }

  list(): Promise<readonly DeadLetterEntry[]> {
    this.prune();
    return Promise.resolve(this.entries.map((item) => item.entry));
  }

  size(): Promise<number> {
    this.prune();
    return Promise.resolve(this.entries.length);
  }

  clear(): Promise<void> {
    this.entries.length = 0;
    return Promise.resolve();
  }

  private prune(): void {
    if (this.ttlMs === Infinity && this.maxSize === Infinity) {
      return;
    }
    const cutoff = this.clock.nowMs() - this.ttlMs;
    this.entries = this.entries.filter((item) => item.addedAt > cutoff);
  }
}
