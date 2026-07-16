import type { EventBus } from "@relcko/events";
import { HealthStatus } from "@relcko/observability";
import type { InMemoryPerformanceRepository } from "./repository";
import { CachingEngine } from "./caching";
import { ConcurrencyController } from "./concurrency";
import { RateLimitingFramework } from "./ratelimit";
import { BatchProcessingEngine } from "./batch";
import { PaginationEngine } from "./pagination";
import { SearchOptimization } from "./search";
import { ObjectPool, WeakCache, estimatedHeapBytes } from "./memory";
import { ResourcePoolManager, type Poolable } from "./pool";
import { QueryOptimizationLayer, ReadModelOptimizer } from "./query";
import { EventThroughputOptimizer } from "./event-throughput";
import { WorkerSchedulingEngine } from "./worker";
import { BackgroundJobOptimizer } from "./job";
import { PerformanceAnalytics, ScalabilityMetrics } from "./analytics";
import { LoadSimulation, PerformanceEventAdapter } from "./loadsim";

/**
 * Central facade for the Performance & Scalability layer. Wires every optimizer
 * through a single concurrency controller and shared repository. It only
 * optimizes — it never changes domain behavior or public APIs.
 */
export class PerformanceService {
  readonly cache: CachingEngine;
  readonly concurrency: ConcurrencyController;
  readonly rateLimit: RateLimitingFramework;
  readonly batch: BatchProcessingEngine;
  readonly pagination: PaginationEngine;
  readonly search: SearchOptimization;
  readonly query: QueryOptimizationLayer;
  readonly readModel: ReadModelOptimizer<unknown>;
  readonly throughput: EventThroughputOptimizer;
  readonly workers: WorkerSchedulingEngine;
  readonly jobs: BackgroundJobOptimizer;
  readonly analytics: PerformanceAnalytics;
  readonly scalability: ScalabilityMetrics;
  readonly load: LoadSimulation;
  readonly eventAdapter: PerformanceEventAdapter;
  readonly weakCache: WeakCache<object, unknown>;
  readonly health = HealthStatus;

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    concurrencyLimit = 16,
    cacheOptions: ConstructorParameters<typeof CachingEngine>[2] = {},
    rateLimitOptions: ConstructorParameters<typeof RateLimitingFramework>[2] = { limit: 1000, windowMs: 60_000 },
  ) {
    this.cache = new CachingEngine(repository, events, cacheOptions);
    this.concurrency = new ConcurrencyController(repository, events, concurrencyLimit);
    this.rateLimit = new RateLimitingFramework(repository, events, rateLimitOptions);
    this.batch = new BatchProcessingEngine(repository, events, this.concurrency);
    this.pagination = new PaginationEngine();
    this.search = new SearchOptimization();
    this.query = new QueryOptimizationLayer(this.cache);
    this.readModel = new ReadModelOptimizer(this.cache, cacheOptions.defaultTtlMs);
    this.throughput = new EventThroughputOptimizer(events, repository);
    this.workers = new WorkerSchedulingEngine(repository, events, this.concurrency);
    this.jobs = new BackgroundJobOptimizer(repository, events, this.concurrency);
    this.analytics = new PerformanceAnalytics(repository, events, () => this.concurrency.stats);
    this.scalability = new ScalabilityMetrics(this.analytics);
    this.load = new LoadSimulation(repository);
    this.eventAdapter = new PerformanceEventAdapter(events, repository);
    this.weakCache = new WeakCache();
  }

  /** Create a typed object pool for reusing expensive resources. */
  createPool<T extends Poolable>(factory: () => T | Promise<T>, max = 50): ResourcePoolManager<T> {
    return new ResourcePoolManager<T>(this.repository, this.events, factory, max);
  }

  snapshot() {
    const cache = this.cache.stats();
    const rate = this.repository.rateLimitStats();
    const batches = this.repository.batchStats();
    this.scalability.cacheHitRate(cache);
    this.scalability.eventThroughput(this.repository.eventThroughputPerSec());
    this.scalability.activeConcurrency(this.concurrency.stats);
    this.scalability.heapUsage(estimatedHeapBytes());
    return this.analytics.snapshot(cache, rate, batches, HealthStatus.Healthy);
  }

  start(): void { this.throughput.start(); this.eventAdapter.start(); }
  stop(): void { this.throughput.stop(); this.eventAdapter.stop(); }
}
