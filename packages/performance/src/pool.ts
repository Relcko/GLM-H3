import type { EntityId, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import { PerformanceEventType, publishPerformanceEvent } from "./events";
import { InMemoryPerformanceRepository } from "./repository";

export interface Poolable {
  readonly id: EntityId;
  close?(): Promise<void> | void;
}

/**
 * Manages a bounded pool of external/expensive resources (connections, clients).
 * Acquire blocks (with timeout) when exhausted and emits a pool-exhausted event.
 * Supports horizontal scaling by capping per-instance resource counts.
 */
export class ResourcePoolManager<T extends Poolable> {
  private readonly idle: T[] = [];
  private readonly inUse = new Set<EntityId>();
  private created = 0;

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly factory: () => T | Promise<T>,
    private readonly max: number = 50,
  ) {}

  get stats(): { idle: number; inUse: number; created: number; max: number } {
    return { idle: this.idle.length, inUse: this.inUse.size, created: this.created, max: this.max };
  }

  async acquire(timeoutMs = 5000): Promise<T> {
    const existing = this.idle.pop();
    if (existing) {
      this.inUse.add(existing.id);
      return existing;
    }
    if (this.inUse.size + this.created < this.max) {
      const resource = await this.factory();
      this.created++;
      this.inUse.add(resource.id);
      return resource;
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await delay(20);
      const recycled = this.idle.pop();
      if (recycled) { this.inUse.add(recycled.id); return recycled; }
    }
    void publishPerformanceEvent(this.events, PerformanceEventType.PoolExhausted, { inUse: this.inUse.size, max: this.max });
    throw new Error("resource pool exhausted");
  }

  release(resource: T): void {
    if (!this.inUse.has(resource.id)) return;
    this.inUse.delete(resource.id);
    this.idle.push(resource);
  }

  async closeAll(): Promise<void> {
    const all = [...this.idle, ...this.createdList()];
    await Promise.all(all.map((r) => r.close?.()));
    this.idle.length = 0;
    this.inUse.clear();
  }

  private createdIds: EntityId[] = [];
  private createdList(): T[] { return this.createdIds as unknown as T[]; }
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
