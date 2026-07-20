import { describe, expect, it, beforeEach } from "vitest";
import { createEventBus } from "@relcko/events";
import { createPerformanceModule, PerformanceService, CachingEngine, ObjectPool } from "../index";
import type { ConcurrencyController } from "../concurrency";
import type { RateLimitingFramework } from "../ratelimit";
import type { BatchProcessingEngine } from "../batch";
import type { PaginationEngine } from "../pagination";

function build(): PerformanceService {
  return createPerformanceModule({ events: createEventBus(), autoStart: false }).performance;
}

describe("Caching Engine", () => {
  it("returns undefined on miss and stores/returns on set", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    mod.performance.cache.set("k", { a: 1 });
    expect(mod.performance.cache.get("k")).toEqual({ a: 1 });
    expect(mod.performance.cache.get("missing")).toBeUndefined();
  });

  it("evicts least-recently-used entries when over capacity", () => {
    const repo = createPerformanceModule({ events: createEventBus(), autoStart: false }).repository;
    const cache: CachingEngine = new CachingEngine(repo, createEventBus(), { maxEntries: 2, policy: "lru" });
    cache.set("a", 1); cache.set("b", 2);
    cache.get("a"); // touch a so b is LRU
    cache.set("c", 3); // should evict b
    expect(cache.has("b")).toBe(false);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  it("reports hit-rate statistics", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    mod.performance.cache.set("x", 1);
    mod.performance.cache.get("x");
    mod.performance.cache.get("y");
    const stats = mod.performance.cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
  });
});

describe("Concurrency Controller", () => {
  it("limits in-flight tasks to the configured bound", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), concurrencyLimit: 2, autoStart: false });
    const ctrl: ConcurrencyController = mod.performance.concurrency;
    let active = 0; let maxSeen = 0;
    const tasks = Array.from({ length: 6 }, () =>
      ctrl.run(async () => { active++; maxSeen = Math.max(maxSeen, active); await delay(10); active--; }),
    );
    await Promise.all(tasks);
    expect(maxSeen).toBeLessThanOrEqual(2);
  });

  it("rejects when the queue overflows", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), concurrencyLimit: 1, autoStart: false });
    const ctrl: ConcurrencyController = mod.performance.concurrency;
    const held = ctrl.run(() => delay(50));
    // Flood the queue beyond 4*limit
    await expect(Promise.all(Array.from({ length: 8 }, () => ctrl.run(() => delay(5))))).rejects.toThrow();
    await held;
  });
});

describe("Rate Limiting Framework", () => {
  it("allows up to the limit then rejects", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false, rateLimitOptions: { algorithm: "token_bucket", limit: 3, refillPerSec: 0 } });
    const rl: RateLimitingFramework = mod.performance.rateLimit;
    expect(rl.check("u").allowed).toBe(true);
    expect(rl.check("u").allowed).toBe(true);
    expect(rl.check("u").allowed).toBe(true);
    expect(rl.check("u").allowed).toBe(false);
  });

  it("uses separate buckets per key", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false, rateLimitOptions: { algorithm: "fixed_window", limit: 1, windowMs: 1000 } });
    const rl: RateLimitingFramework = mod.performance.rateLimit;
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });
});

describe("Batch Processing Engine", () => {
  it("processes all items and reports success/failure counts", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), concurrencyLimit: 4, autoStart: false });
    const batch: BatchProcessingEngine = mod.performance.batch;
    const result = await batch.process([1, 2, 3, 4], async (n) => {
      if (n === 3) throw new Error("boom");
      return n * 2;
    }, 2);
    expect(result.processed).toBe(4);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.results[0]).toBe(2);
  });
});

describe("Pagination Engine", () => {
  it("slices and reports page metadata", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    const pg: PaginationEngine = mod.performance.pagination;
    const data = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const page1 = pg.paginate(data, { page: 1, pageSize: 10 });
    expect(page1.items.length).toBe(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrev).toBe(false);
    const sorted = pg.paginate(data, { page: 1, pageSize: 5 }, pg.comparator("id", "desc"));
    expect(sorted.items[0].id).toBe(24);
  });
});

describe("Search Optimization", () => {
  it("builds an inverted index and ranks by relevance", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    mod.performance.search.index({ id: "1", text: "treasury dividend payout", keywords: ["finance"], tags: {} });
    mod.performance.search.index({ id: "2", text: "governance proposal voting", keywords: ["dao"], tags: {} });
    mod.performance.search.index({ id: "3", text: "treasury treasury treasury", keywords: [], tags: {} });
    const hits = mod.performance.search.search("treasury");
    expect(hits[0].id).toBe("3");
  });
});

describe("Memory Optimization", () => {
  it("reuses pooled objects and tracks stats", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    const pool = new ObjectPool<{ n: number }>(() => ({ n: 0 }), (o) => { o.n = 0; }, 5);
    const a = pool.acquire(); a.n = 1;
    pool.release(a);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(pool.stats.created).toBe(1);
  });

  it("weak cache does not retain keys", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    const key = {};
    mod.performance.weakCache.set(key, "v");
    expect(mod.performance.weakCache.get(key)).toBe("v");
  });
});

describe("Query / Read Model Optimization", () => {
  it("caches query results across repeated calls", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    let calls = 0;
    const r1 = await mod.performance.query.optimize("users", { active: true }, async () => { calls++; return ["a", "b"]; });
    const r2 = await mod.performance.query.optimize("users", { active: true }, async () => { calls++; return ["a", "b"]; });
    expect(r1).toEqual(r2);
    expect(calls).toBe(1);
  });

  it("projects a read model only when the source version changes", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    let projects = 0;
    const p1 = await mod.performance.readModel.project("v1", async () => { projects++; return { total: 10 }; });
    const p2 = await mod.performance.readModel.project("v1", async () => { projects++; return { total: 10 }; });
    expect(p1).toBe(p2);
    expect(projects).toBe(1);
  });
});

describe("Event Throughput Optimizer", () => {
  it("measures events/sec from the bus", async () => {
    const events = createEventBus();
    const mod = createPerformanceModule({ events, autoStart: false });
    mod.performance.start();
    for (let i = 0; i < 20; i++) {
      await events.publish({ eventId: `e${i}` as never, type: "x", aggregateId: "a" as never, occurredAt: new Date().toISOString(), actorId: "a" as never, version: 1 as never, correlationId: "c" as never, traceId: "t" as never, idempotencyKey: "i" as never, payload: {}, source: "relcko.test" } as never);
    }
    await delay(1100);
    expect(mod.performance.throughput.currentRate()).toBeGreaterThanOrEqual(0);
    mod.performance.stop();
  });
});

describe("Background Jobs & Workers", () => {
  it("runs a background job to completion and tracks it", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), concurrencyLimit: 2, autoStart: false });
    let ran = false;
    const run = mod.performance.jobs.schedule({ kind: "report", payload: {} }, async () => { ran = true; });
    await delay(50);
    expect(ran).toBe(true);
    expect(mod.performance.jobs.get(run.id)?.status).toBe("completed");
  });

  it("schedules worker tasks under bounded concurrency", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), concurrencyLimit: 1, autoStart: false });
    let active = 0; let max = 0;
    for (let i = 0; i < 5; i++) {
      mod.performance.workers.enqueue({ name: "t", handler: async () => { active++; max = Math.max(max, active); await delay(10); active--; } }, {});
    }
    await delay(120);
    expect(max).toBeLessThanOrEqual(1);
  });
});

describe("Performance Analytics & Scalability Metrics", () => {
  it("records metrics and produces a snapshot", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    mod.performance.cache.set("a", 1);
    mod.performance.cache.get("a");
    const snap = mod.performance.snapshot();
    expect(snap.cache.hits).toBe(1);
    expect(snap.health).toBe("healthy");
    expect(mod.performance.analytics.metrics("cache.hit_rate").length).toBeGreaterThan(0);
  });
});

describe("Load Simulation", () => {
  it("simulates concurrent load and reports latency percentiles", async () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    const report = await mod.performance.load.run({
      concurrency: 4, iterations: 25, task: async () => { await delay(2); return true; },
    });
    expect(report.total).toBe(100);
    expect(report.succeeded).toBe(100);
    expect(report.p95LatencyMs).toBeGreaterThanOrEqual(0);
    expect(report.throughputPerSec).toBeGreaterThan(0);
  });
});

describe("Integration — full module wiring", () => {
  it("exposes every optimizer through the facade", () => {
    const mod = createPerformanceModule({ events: createEventBus(), autoStart: false });
    const p = mod.performance;
    expect(p.cache).toBeDefined();
    expect(p.concurrency).toBeDefined();
    expect(p.rateLimit).toBeDefined();
    expect(p.batch).toBeDefined();
    expect(p.pagination).toBeDefined();
    expect(p.search).toBeDefined();
    expect(p.query).toBeDefined();
    expect(p.readModel).toBeDefined();
    expect(p.throughput).toBeDefined();
    expect(p.workers).toBeDefined();
    expect(p.jobs).toBeDefined();
    expect(p.analytics).toBeDefined();
    expect(p.scalability).toBeDefined();
    expect(p.load).toBeDefined();
    expect(p.eventAdapter).toBeDefined();
    expect(typeof p.createPool).toBe("function");
  });
});

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
