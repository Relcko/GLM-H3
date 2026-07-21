import type { EventStore, StoredEvent } from "@relcko/event-store";
import type { DomainEvent } from "@relcko/kernel";
import { reconstructDomainEvents } from "../infrastructure/event-store/domain-event-reconstructor";
import {
  type EventStoreReadConfig,
  DEFAULT_EVENT_STORE_READ_CONFIG,
} from "./types";

interface StreamCacheEntry {
  readonly events: readonly StoredEvent[];
  readonly loadedAt: number;
  readonly streamId: string;
}

export interface PageResult {
  readonly events: readonly StoredEvent[];
  readonly pageNumber: number;
  readonly hasMore: boolean;
  readonly totalAvailable: number;
}

export interface IncrementalReplayResult {
  readonly events: readonly StoredEvent[];
  readonly fromPosition: number;
  readonly toPosition: number;
  readonly hasMore: boolean;
}

export class EventStoreReadOptimizer {
  private readonly _cache = new Map<string, StreamCacheEntry>();
  private _totalCacheHits = 0;
  private _totalCacheMisses = 0;
  private _totalEventsRead = 0;

  constructor(
    private readonly eventStore: EventStore,
    private readonly config: EventStoreReadConfig = DEFAULT_EVENT_STORE_READ_CONFIG,
  ) {}

  get cacheHitRate(): number {
    const total = this._totalCacheHits + this._totalCacheMisses;
    return total > 0 ? this._totalCacheHits / total : 0;
  }

  get totalEventsRead(): number {
    return this._totalEventsRead;
  }

  clearCache(): void {
    this._cache.clear();
    this._totalCacheHits = 0;
    this._totalCacheMisses = 0;
  }

  invalidateStream(streamId: string): void {
    this._cache.delete(streamId);
  }

  async loadStreamPaged(
    streamId: string,
    pageNumber: number = 0,
  ): Promise<PageResult> {
    const offset = pageNumber * this.config.pageSize;
    const allEvents = await this.getStreamEvents(streamId);
    const page = allEvents.slice(offset, offset + this.config.pageSize);
    return {
      events: page,
      pageNumber,
      hasMore: offset + this.config.pageSize < allEvents.length,
      totalAvailable: allEvents.length,
    };
  }

  async lazyLoadStream(
    streamId: string,
    offset: number = 0,
    limit?: number,
  ): Promise<readonly StoredEvent[]> {
    if (!this.config.enableLazyLoading) {
      return this.getStreamEvents(streamId);
    }
    const cached = this._cache.get(streamId);
    if (cached && this.isCacheValid(cached)) {
      this._totalCacheHits += 1;
      const events = cached.events;
      const slice = limit !== undefined ? events.slice(offset, offset + limit) : events.slice(offset);
      return slice;
    }
    this._totalCacheMisses += 1;
    const events = await this.loadAllEvents(streamId);
    this.cacheStream(streamId, events);
    const slice = limit !== undefined ? events.slice(offset, offset + limit) : events.slice(offset);
    return slice;
  }

  async incrementalReplay(
    fromPosition: number,
    toPosition?: number,
  ): Promise<IncrementalReplayResult> {
    const storedEvents: StoredEvent[] = [];
    for await (const event of this.eventStore.stream({ fromPosition })) {
      if (toPosition !== undefined && event.globalPosition > toPosition) break;
      storedEvents.push(event);
      this._totalEventsRead += 1;
    }
    const lastPosition =
      storedEvents.length > 0
        ? storedEvents[storedEvents.length - 1]!.globalPosition
        : fromPosition;
    return {
      events: storedEvents,
      fromPosition,
      toPosition: lastPosition,
      hasMore: toPosition === undefined || lastPosition >= toPosition,
    };
  }

  async snapshotAssistedLoad<T>(
    streamId: string,
    snapshot: { version: number; data: T } | null,
    reconstructor: (
      snapshot: T,
      events: readonly DomainEvent[],
    ) => { data: T; version: number },
  ): Promise<{ data: T; version: number }> {
    let fromVersion = 0;
    let currentData: T;

    if (snapshot && this.config.enableSnapshotAssist) {
      fromVersion = snapshot.version;
      currentData = snapshot.data;
    } else {
      fromVersion = 0;
      currentData = {} as T;
    }

    const stream = await this.eventStore.load(streamId);
    const allEvents = stream.events;
    const newEvents = allEvents.filter((e) => e.version > fromVersion);
    this._totalEventsRead += newEvents.length;

    if (newEvents.length === 0) {
      return { data: currentData, version: fromVersion };
    }

    const domainEvents = reconstructDomainEvents(newEvents);
    return reconstructor(currentData, domainEvents);
  }

  private async getStreamEvents(streamId: string): Promise<readonly StoredEvent[]> {
    const cached = this._cache.get(streamId);
    if (cached && this.isCacheValid(cached)) {
      this._totalCacheHits += 1;
      return cached.events;
    }
    this._totalCacheMisses += 1;
    return this.loadAllEvents(streamId);
  }

  private async loadAllEvents(streamId: string): Promise<readonly StoredEvent[]> {
    const stream = await this.eventStore.load(streamId);
    const events = stream.events;
    this._totalEventsRead += events.length;
    this.cacheStream(streamId, events);
    return events;
  }

  private cacheStream(streamId: string, events: readonly StoredEvent[]): void {
    if (!this.config.enableLazyLoading) return;
    if (this._cache.size >= this.config.cacheMaxStreams) {
      const oldestKey = this._cache.keys().next().value;
      if (oldestKey !== undefined) {
        this._cache.delete(oldestKey);
      }
    }
    this._cache.set(streamId, {
      events,
      loadedAt: this.clock.nowMs(),
      streamId,
    });
  }

  private isCacheValid(entry: StreamCacheEntry): boolean {
    if (this.config.cacheTtlMs <= 0) return true;
    return this.clock.nowMs() - entry.loadedAt < this.config.cacheTtlMs;
  }

  private readonly _clock = { nowMs: () => Date.now() };

  private get clock(): { nowMs: () => number } {
    return this._clock;
  }
}
