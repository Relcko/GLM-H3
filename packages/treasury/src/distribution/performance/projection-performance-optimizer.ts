import type { EventEnvelope } from "@relcko/events";
import type { IDurableProjectionStore } from "../infrastructure/projections/durable/durable-projection-store";
import {
  type ProjectionCacheConfig,
  DEFAULT_PROJECTION_CACHE_CONFIG,
} from "./types";

interface CacheEntry<T> {
  readonly data: T;
  readonly loadedAt: number;
}

interface PendingWrite {
  readonly storeName: string;
  readonly id: string;
  readonly data: unknown;
  readonly expectedVersion: number;
}

export interface BulkWriteResult {
  readonly successCount: number;
  readonly failureCount: number;
  readonly errors: readonly string[];
  readonly totalTimeMs: number;
}

export class ProjectionPerformanceOptimizer {
  private readonly _cache = new Map<string, CacheEntry<unknown>>();
  private readonly _pendingWrites: PendingWrite[] = [];
  private readonly _bulkWriteTimings: number[] = [];
  private _totalWritesFlushed = 0;
  private _hits = 0;
  private _misses = 0;

  constructor(
    private readonly cacheConfig: ProjectionCacheConfig = DEFAULT_PROJECTION_CACHE_CONFIG,
    private readonly clock: { nowMs: () => number },
  ) {}

  get cacheHitRate(): number {
    const total = this._hits + this._misses;
    return total > 0 ? this._hits / total : 0;
  }

  get totalWritesFlushed(): number {
    return this._totalWritesFlushed;
  }

  get pendingWriteCount(): number {
    return this._pendingWrites.length;
  }

  get averageBulkWriteTimeMs(): number {
    if (this._bulkWriteTimings.length === 0) return 0;
    return (
      this._bulkWriteTimings.reduce((a, b) => a + b, 0) /
      this._bulkWriteTimings.length
    );
  }

  findCached<T>(storeName: string, id: string): T | null {
    const key = `${storeName}:${id}`;
    const entry = this._cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this._misses += 1;
      return null;
    }
    if (this.cacheConfig.ttlMs > 0 && this.clock.nowMs() - entry.loadedAt > this.cacheConfig.ttlMs) {
      this._cache.delete(key);
      this._misses += 1;
      return null;
    }
    this._hits += 1;
    return entry.data;
  }

  setCached<T>(storeName: string, id: string, data: T): void {
    if (!this.cacheConfig.enabled) return;
    if (this._cache.size >= this.cacheConfig.maxEntries) {
      const oldestKey = this._cache.keys().next().value;
      if (oldestKey !== undefined) {
        this._cache.delete(oldestKey);
      }
    }
    const key = `${storeName}:${id}`;
    this._cache.set(key, { data, loadedAt: this.clock.nowMs() });
  }

  invalidateCache(storeName: string, id?: string): void {
    if (id) {
      this._cache.delete(`${storeName}:${id}`);
    } else {
      for (const key of this._cache.keys()) {
        if (key.startsWith(`${storeName}:`)) {
          this._cache.delete(key);
        }
      }
    }
  }

  enqueueWrite<T extends { version: number }>(
    store: IDurableProjectionStore<T>,
    id: string,
    data: T,
    expectedVersion: number,
  ): void {
    this._pendingWrites.push({
      storeName: store.name,
      id,
      data,
      expectedVersion,
    });
  }

  async flushWrites(): Promise<BulkWriteResult> {
    if (this._pendingWrites.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [], totalTimeMs: 0 };
    }

    const startTime = this.clock.nowMs();
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    const writes = [...this._pendingWrites];
    this._pendingWrites.length = 0;

    for (const write of writes) {
      const storeName = write.storeName;
      const store = this.findStore(storeName);
      if (!store) {
        failureCount += 1;
        errors.push(`Store ${storeName} not found`);
        continue;
      }
      try {
        const result = await (store as IDurableProjectionStore<{ version: number }>).save(
          write.id,
          write.data as { version: number },
          write.expectedVersion,
        );
        if (result.success) {
          successCount += 1;
          this.setCached(storeName, write.id, write.data);
        } else {
          failureCount += 1;
          errors.push(result.error?.message ?? "Unknown error");
        }
      } catch (err) {
        failureCount += 1;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const totalTimeMs = this.clock.nowMs() - startTime;
    this._bulkWriteTimings.push(totalTimeMs);
    this._totalWritesFlushed += successCount;

    return { successCount, failureCount, errors, totalTimeMs };
  }

  groupEventsByType(envelopes: readonly EventEnvelope[]): Map<string, EventEnvelope[]> {
    const groups = new Map<string, EventEnvelope[]>();
    for (const env of envelopes) {
      const eventType = env.metadata.eventType;
      const group = groups.get(eventType);
      if (group) {
        group.push(env);
      } else {
        groups.set(eventType, [env]);
      }
    }
    return groups;
  }

  clearCache(): void {
    this._cache.clear();
    this._hits = 0;
    this._misses = 0;
  }

  clearPendingWrites(): void {
    this._pendingWrites.length = 0;
  }

  reset(): void {
    this.clearCache();
    this.clearPendingWrites();
    this._bulkWriteTimings.length = 0;
    this._totalWritesFlushed = 0;
  }

  private readonly _stores = new Map<string, IDurableProjectionStore<{ version: number }>>();

  registerStore(store: IDurableProjectionStore<{ version: number }>): void {
    this._stores.set(store.name, store);
  }

  private findStore(name: string): IDurableProjectionStore<{ version: number }> | undefined {
    return this._stores.get(name);
  }
}
