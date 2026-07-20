/**
 * Memory optimization primitives:
 *  - ObjectPool: reuse expensive objects (buffers, DTOs) to cut GC pressure.
 *  - WeakCache: bounded memoization that does not prevent GC of keys.
 * These are internal optimizations; they hold no domain state.
 */
export class ObjectPool<T> {
  private readonly available: T[] = [];
  private created = 0;

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
    private readonly max: number = 1000,
  ) {}

  acquire(): T {
    const item = this.available.pop();
    if (item) return item;
    this.created++;
    return this.factory();
  }

  release(item: T): void {
    this.reset(item);
    if (this.available.length < this.max) this.available.push(item);
  }

  get stats(): { created: number; available: number; max: number } {
    return { created: this.created, available: this.available.length, max: this.max };
  }
}

export class WeakCache<K extends object, V> {
  private readonly store = new WeakMap<K, V>();
  get(key: K): V | undefined { return this.store.get(key); }
  set(key: K, value: V): void { this.store.set(key, value); }
  has(key: K): boolean { return this.store.has(key); }
}

/** Approximate heap usage (Node). Returns 0 in non-V8 runtimes. */
export function estimatedHeapBytes(): number {
  const g = globalThis as unknown as { gc?: () => void; performance?: unknown };
  void g;
  const mem = (globalThis as unknown as { process?: { memoryUsage?: () => { heapUsed: number } } }).process?.memoryUsage?.();
  return mem?.heapUsed ?? 0;
}
