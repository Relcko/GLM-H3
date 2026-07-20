import type { EntityId, Json } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import { createEnvelope } from "@relcko/events";
import { generateId } from "@relcko/utils";

export enum PerformanceEventType {
  MetricRecorded = "relcko.performance.metric_recorded",
  CacheHit = "relcko.performance.cache_hit",
  CacheMiss = "relcko.performance.cache_miss",
  CacheEvicted = "relcko.performance.cache_evicted",
  ConcurrencyLimit = "relcko.performance.concurrency_limit",
  RateLimitRejected = "relcko.performance.rate_limit_rejected",
  BatchCompleted = "relcko.performance.batch_completed",
  JobCompleted = "relcko.performance.job_completed",
  ThroughputSampled = "relcko.performance.throughput_sampled",
  PoolExhausted = "relcko.performance.pool_exhausted",
}

/** Publish a performance-only event onto the canonical Event Bus. */
export async function publishPerformanceEvent(
  events: EventBus,
  type: PerformanceEventType | string,
  payload: Json,
  options: { actorId?: EntityId; aggregateId?: EntityId; correlationId?: string; traceId?: string } = {},
): Promise<void> {
  await events.publish(
    createEnvelope({
      type,
      aggregateId: options.aggregateId ?? (generateId("perf") as EntityId),
      actorId: options.actorId ?? ("relcko_performance" as EntityId),
      payload,
      correlationId: options.correlationId,
      traceId: options.traceId,
      source: "relcko.performance",
    }),
  );
}
