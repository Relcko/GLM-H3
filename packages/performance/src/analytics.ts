import { HealthStatus } from "@relcko/observability";
import type { Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { InMemoryPerformanceRepository } from "./repository";
import type {
  CacheStats, ConcurrencySample, PerformanceArea, PerformanceSnapshot, ScalabilityMetric,
} from "./types";
import { estimatedHeapBytes } from "./memory";
import { PerformanceEventType, publishPerformanceEvent } from "./events";
import type { Json } from "@relcko/types";

/** Aggregates performance signals into a single snapshot and persists
 * scalability metrics. Reuses the repository; publishes metric events. */
export class PerformanceAnalytics {
  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly concurrency: () => ConcurrencySample,
  ) {}

  snapshot(cache: CacheStats, rateLimit: { checks: number; rejections: number }, batches: { executed: number; itemsProcessed: number }, health: HealthStatus = HealthStatus.Healthy): PerformanceSnapshot {
    const snap: PerformanceSnapshot = {
      cache,
      concurrency: this.concurrency(),
      rateLimit,
      batches,
      eventThroughputPerSec: this.repository.eventThroughputPerSec(),
      memory: { heapUsedBytes: estimatedHeapBytes(), poolSize: 0 },
      health,
      computedAt: new Date().toISOString(),
    };
    void publishPerformanceEvent(this.events, PerformanceEventType.MetricRecorded, { type: "snapshot", ...snap } as unknown as Json);
    return snap;
  }

  recordMetric(name: string, value: number, unit: string, area: PerformanceArea): ScalabilityMetric {
    const metric: ScalabilityMetric = { name, value, unit, area, recordedAt: new Date().toISOString() };
    this.repository.saveMetric(metric);
    void publishPerformanceEvent(this.events, PerformanceEventType.MetricRecorded, metric as unknown as Json);
    return metric;
  }

  metrics(name?: string): readonly ScalabilityMetric[] { return this.repository.listMetrics(name); }
}

/** Convenience helpers for the most common scalability indicators. */
export class ScalabilityMetrics {
  constructor(private readonly analytics: PerformanceAnalytics) {}

  cacheHitRate(cache: CacheStats): ScalabilityMetric {
    return this.analytics.recordMetric("cache.hit_rate", Number((cache.hitRate * 100).toFixed(2)), "percent", "cache");
  }

  eventThroughput(perSec: number): ScalabilityMetric {
    return this.analytics.recordMetric("event.throughput", perSec, "events/sec", "event_throughput");
  }

  activeConcurrency(sample: ConcurrencySample): ScalabilityMetric {
    return this.analytics.recordMetric("concurrency.active", sample.active, "tasks", "concurrency");
  }

  heapUsage(bytes: number): ScalabilityMetric {
    return this.analytics.recordMetric("memory.heap_used", bytes, "bytes", "memory");
  }
}
