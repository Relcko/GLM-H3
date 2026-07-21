import { systemClock } from '@relcko/kernel';

import type { Clock } from '@relcko/kernel';

/**
 * Handle to an acquired lock. Releasing is safe to call multiple times and
 * never unlocks a lock re-acquired by someone else (token-checked).
 */
export interface LockHandle {
  /** Locked key. */
  readonly key: string;
  /** Unique token identifying this acquisition. */
  readonly token: string;
  /** Epoch milliseconds when the lock expires. */
  readonly expiresAt: number;

  /**
   * Releases the lock if still held by this handle.
   *
   * @returns resolved when the release attempt completed
   */
  release(): Promise<void>;

  /**
   * Extends the lock TTL. Has no effect when the lock was already released
   * or acquired by a different holder.
   *
   * @param ttlMs - additional time-to-live in milliseconds from now
   * @returns true when the renewal succeeded, false when the lock is no longer held
   */
  renew(ttlMs: number): Promise<boolean>;
}

/**
 * Distributed lock abstraction (Playbook 12.3 - scheduled jobs must not run
 * concurrently across instances).
 */
export interface DistributedLock {
  /**
   * Attempts to acquire a lock on key.
   *
   * @param key - lock key
   * @param ttlMs - time-to-live in milliseconds after which the lock lapses
   * @returns a lock handle, or null when the lock is held by someone else
   */
  acquire(key: string, ttlMs: number): Promise<LockHandle | null>;
}

/**
 * In-process {@link DistributedLock}. Suitable for single-instance
 * deployments and tests; multi-instance deployments require a shared
 * implementation (e.g. Redis or Postgres advisory locks).
 */
export class InMemoryDistributedLock implements DistributedLock {
  private readonly locks = new Map<string, { token: string; expiresAt: number }>();
  private readonly clock: Clock;

  /**
   * @param clock - clock used for expiry; defaults to the system clock
   */
  constructor(clock: Clock = systemClock) {
    this.clock = clock;
  }

  acquire(key: string, ttlMs: number): Promise<LockHandle | null> {
    const now = this.clock.nowMs();
    const existing = this.locks.get(key);
    if (existing !== undefined && existing.expiresAt > now) {
      return Promise.resolve(null);
    }
    const token = crypto.randomUUID();
    const expiresAt = now + ttlMs;
    this.locks.set(key, { token, expiresAt });
    const renew = (newTtlMs: number): Promise<boolean> => {
      const current = this.locks.get(key);
      if (current?.token !== token) {
        return Promise.resolve(false);
      }
      current.expiresAt = this.clock.nowMs() + newTtlMs;
      return Promise.resolve(true);
    };
    const handle: LockHandle = {
      key,
      token,
      expiresAt,
      release: () => {
        const current = this.locks.get(key);
        if (current?.token === token) {
          this.locks.delete(key);
        }
        return Promise.resolve();
      },
      renew,
    };
    return Promise.resolve(handle);
  }
}
