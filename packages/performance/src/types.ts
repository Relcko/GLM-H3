import type { EntityId, Json, Timestamp } from "@relcko/types";
import type { HealthStatus } from "@relcko/observability";

/** Optimization domains covered by the performance layer. */
export type PerformanceArea =
  | "cache" | "concurrency" | "batch" | "pagination" | "search"
  | "memory" | "pool" | "query" | "read_model" | "event_throughput"
  | "worker" | "job" | "rate_limit" | "analytics";

export type CacheEvictionPolicy = "ttl" | "lru" | "fifo" | "none";

export interface CacheEntry<V = unknown> {
  readonly key: string;
  readonly value: V;
  readonly storedAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly hits: number;
  readonly sizeBytes: number;
}

export interface CacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
  readonly estimatedSizeBytes: number;
}

export interface PaginationRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
}

export interface PaginationResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

export interface BatchResult<T> {
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly errors: readonly { readonly index: number; readonly error: string }[];
  readonly durationMs: number;
  readonly results: readonly T[];
}

export type RateLimitAlgorithm = "token_bucket" | "fixed_window" | "sliding_window";

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt: Timestamp;
  readonly retryAfterMs: number;
}

export interface ConcurrencySample {
  readonly active: number;
  readonly queued: number;
  readonly limit: number;
  readonly sampledAt: Timestamp;
}

export interface WorkerTask {
  readonly id: EntityId;
  readonly name: string;
  readonly payload: Readonly<Record<string, Json>>;
  readonly scheduledAt: Timestamp;
  readonly startedAt?: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly status: "queued" | "running" | "completed" | "failed";
  readonly error?: string;
  readonly attempts: number;
}

export interface JobRun {
  readonly id: EntityId;
  readonly kind: string;
  readonly status: "scheduled" | "running" | "completed" | "failed";
  readonly enqueuedAt: Timestamp;
  readonly startedAt?: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly durationMs?: number;
  readonly itemsProcessed: number;
}

export interface ScalabilityMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly area: PerformanceArea;
  readonly recordedAt: Timestamp;
}

export interface PerformanceSnapshot {
  readonly cache: CacheStats;
  readonly concurrency: ConcurrencySample;
  readonly rateLimit: { readonly checks: number; readonly rejections: number };
  readonly batches: { readonly executed: number; readonly itemsProcessed: number };
  readonly eventThroughputPerSec: number;
  readonly memory: { readonly heapUsedBytes: number; readonly poolSize: number };
  readonly health: HealthStatus;
  readonly computedAt: Timestamp;
}

export interface LoadSimulationOptions {
  readonly concurrency: number;
  readonly iterations: number;
  readonly rampUpMs?: number;
  readonly task: (index: number) => Promise<unknown> | unknown;
}

export interface LoadSimulationReport {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly durationMs: number;
  readonly throughputPerSec: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly errors: readonly string[];
}
