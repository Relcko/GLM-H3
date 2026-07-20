import type { Json } from "@relcko/types";
import type { CachingEngine } from "./caching";

/**
 * Adds caching around an expensive query function. The cache key is derived from
 * the query name + a stable hash of its parameters. This is an internal
 * optimization that wraps existing read paths without changing their contract.
 */
export class QueryOptimizationLayer {
  constructor(private readonly cache: CachingEngine) {}

  async optimize<T>(
    queryName: string,
    params: Readonly<Record<string, Json>>,
    executor: () => Promise<T> | T,
    ttlMs?: number,
  ): Promise<T> {
    const key = `q:${queryName}:${hashParams(params)}`;
    const cached = this.cache.get(key) as T | undefined;
    if (cached !== undefined) return cached;
    const result = await executor();
    this.cache.set(key, result as unknown, ttlMs);
    return result;
  }
}

/** Optimizes repeated/filtered reads by projecting a source collection into a
 * cached read model, recomputed only when the source version changes. */
export class ReadModelOptimizer<R> {
  private current: R | undefined;
  private version = "";

  constructor(private readonly cache: CachingEngine, private readonly ttlMs = 30_000) {}

  async project(
    sourceVersion: string,
    projector: () => Promise<R> | R,
  ): Promise<R> {
    if (this.version === sourceVersion && this.current !== undefined) return this.current;
    const key = `readmodel:${sourceVersion}`;
    const cached = this.cache.get(key) as R | undefined;
    if (cached !== undefined) { this.current = cached; this.version = sourceVersion; return cached; }
    const projected = await projector();
    this.cache.set(key, projected as unknown, this.ttlMs);
    this.current = projected;
    this.version = sourceVersion;
    return projected;
  }
}

function hashParams(params: Readonly<Record<string, Json>>): string {
  try {
    return JSON.stringify(params);
  } catch {
    return String(params);
  }
}
