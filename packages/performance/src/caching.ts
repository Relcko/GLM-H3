import type { EventBus } from "@relcko/events";
import type { CacheEntry, CacheEvictionPolicy, CacheStats } from "./types";
import { PerformanceEventType, publishPerformanceEvent } from "./events";
import { InMemoryPerformanceRepository } from "./repository";

interface InternalEntry<V> extends CacheEntry<V> {
  lastAccessedAt: number;
  sequence: number;
  accessSeq: number;
}

/**
 * In-process cache with TTL and LRU eviction. Bounds memory by `maxEntries`
 * and `maxSizeBytes`. Every hit/miss/eviction is accounted in the repository
 * and published as a performance-only event. This is an internal optimization
 * primitive — it does not duplicate any domain logic.
 */
export class CachingEngine<V = unknown> {
  private readonly store = new Map<string, InternalEntry<V>>();
  private sequence = 0;

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly options: {
      readonly maxEntries?: number;
      readonly maxSizeBytes?: number;
      readonly defaultTtlMs?: number;
      readonly policy?: CacheEvictionPolicy;
    } = {},
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.repository.recordCacheMiss();
      void publishPerformanceEvent(this.events, PerformanceEventType.CacheMiss, { key });
      return undefined;
    }
    if (entry.expiresAt && Date.now() >= Date.parse(entry.expiresAt)) {
      this.store.delete(key);
      this.repository.recordCacheMiss();
      void publishPerformanceEvent(this.events, PerformanceEventType.CacheMiss, { key, expired: true });
      return undefined;
    }
    const updated: InternalEntry<V> = { ...entry, hits: entry.hits + 1, lastAccessedAt: Date.now(), accessSeq: this.sequence++ };
    this.store.set(key, updated);
    this.repository.recordCacheHit();
    void publishPerformanceEvent(this.events, PerformanceEventType.CacheHit, { key });
    return updated.value;
  }

  set(key: string, value: V, ttlMs?: number): void {
    const sizeBytes = estimateSize(value);
    const entry: InternalEntry<V> = {
      key, value, storedAt: new Date().toISOString(),
      expiresAt: ttlMs ?? this.options.defaultTtlMs ? new Date(Date.now() + (ttlMs ?? this.options.defaultTtlMs ?? 0)).toISOString() : undefined,
      hits: 0, sizeBytes, lastAccessedAt: Date.now(), sequence: this.sequence, accessSeq: this.sequence++,
    };
    this.store.set(key, entry);
    this.enforceBounds(sizeBytes);
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() >= Date.parse(entry.expiresAt)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean { return this.store.delete(key); }

  clear(): void { this.store.clear(); }

  stats(): CacheStats {
    let size = 0;
    for (const e of this.store.values()) size += e.sizeBytes;
    return this.repository.cacheStats(this.store.size, size);
  }

  keys(): readonly string[] { return [...this.store.keys()]; }

  private enforceBounds(incomingBytes: number): void {
    const maxEntries = this.options.maxEntries ?? 10000;
    const maxSize = this.options.maxSizeBytes ?? Number.POSITIVE_INFINITY;
    let size = incomingBytes;
    for (const e of this.store.values()) size += e.sizeBytes;

    while (this.store.size > maxEntries || size > maxSize) {
      const victim = this.selectEvictionCandidate();
      if (!victim) break;
      const removed = this.store.get(victim);
      this.store.delete(victim);
      if (removed) {
        size -= removed.sizeBytes;
        this.repository.recordCacheEviction();
        void publishPerformanceEvent(this.events, PerformanceEventType.CacheEvicted, { key: victim });
      }
    }
  }

  private selectEvictionCandidate(): string | undefined {
    const policy = this.options.policy ?? "lru";
    if (policy === "lru") {
      let oldest: string | undefined; let oldestSeq = Number.POSITIVE_INFINITY;
      for (const [k, e] of this.store) if (e.accessSeq < oldestSeq) { oldestSeq = e.accessSeq; oldest = k; }
      return oldest;
    }
    if (policy === "fifo") {
      let oldest: string | undefined; let oldestSeq = Number.POSITIVE_INFINITY;
      for (const [k, e] of this.store) if (e.sequence < oldestSeq) { oldestSeq = e.sequence; oldest = k; }
      return oldest;
    }
    return this.store.keys().next().value;
  }
}

function estimateSize(value: unknown): number {
  if (value == null) return 8;
  if (typeof value === "string") return value.length * 2 + 16;
  if (typeof value === "number" || typeof value === "boolean") return 8;
  try {
    return JSON.stringify(value).length * 2 + 16;
  } catch {
    return 64;
  }
}
