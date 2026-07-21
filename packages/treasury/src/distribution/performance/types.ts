export interface ThroughputSnapshot {
  readonly opsPerSecond: number;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly totalOps: number;
  readonly errorCount: number;
}

export interface LatencySnapshot {
  readonly minMs: number;
  readonly maxMs: number;
  readonly avgMs: number;
  readonly p50Ms: number;
  readonly p90Ms: number;
  readonly p99Ms: number;
  readonly sampleCount: number;
}

export interface QueueDepthSnapshot {
  readonly current: number;
  readonly peak: number;
  readonly limit: number;
  readonly utilizationRatio: number;
}

export interface PerformanceMetricsReport {
  readonly label: string;
  readonly collectedAt: number;
  readonly throughput: ThroughputSnapshot;
  readonly latency: LatencySnapshot;
  readonly queue: QueueDepthSnapshot;
  readonly activeWorkers: number;
  readonly errorRate: number;
  readonly retryRate: number;
  readonly processingTime: number;
}

export interface BatchStats {
  readonly batchSize: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalTimeMs: number;
  readonly avgTimePerItemMs: number;
  readonly adaptiveSize: number;
}

export interface BatchConfig {
  readonly minBatchSize: number;
  readonly maxBatchSize: number;
  readonly initialBatchSize: number;
  readonly adaptiveStepUp: number;
  readonly adaptiveStepDown: number;
  readonly successThresholdForStepUp: number;
  readonly chunkSize?: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  minBatchSize: 1,
  maxBatchSize: 100,
  initialBatchSize: 10,
  adaptiveStepUp: 5,
  adaptiveStepDown: 2,
  successThresholdForStepUp: 0.8,
};

export interface ParallelismConfig {
  readonly maxConcurrency: number;
  readonly preserveOrder: boolean;
  readonly abortOnFailureThreshold: number;
  readonly abortOnFailureCount?: number;
}

export const DEFAULT_PARALLELISM_CONFIG: ParallelismConfig = {
  maxConcurrency: 5,
  preserveOrder: true,
  abortOnFailureThreshold: 0.5,
};

export interface BackpressureConfig {
  readonly highWaterMark: number;
  readonly lowWaterMark: number;
  readonly maxRatePerSecond: number;
  readonly minDelayBetweenBatchesMs: number;
  readonly maxDelayBetweenBatchesMs: number;
  readonly overflowStrategy: "reject" | "drop" | "block";
}

export const DEFAULT_BACKPRESSURE_CONFIG: BackpressureConfig = {
  highWaterMark: 100,
  lowWaterMark: 30,
  maxRatePerSecond: 50,
  minDelayBetweenBatchesMs: 10,
  maxDelayBetweenBatchesMs: 1000,
  overflowStrategy: "block",
};

export interface ProjectionCacheConfig {
  readonly enabled: boolean;
  readonly maxEntries: number;
  readonly ttlMs: number;
}

export const DEFAULT_PROJECTION_CACHE_CONFIG: ProjectionCacheConfig = {
  enabled: true,
  maxEntries: 500,
  ttlMs: 60000,
};

export interface EventStoreReadConfig {
  readonly pageSize: number;
  readonly enableLazyLoading: boolean;
  readonly enableSnapshotAssist: boolean;
  readonly cacheMaxStreams: number;
  readonly cacheTtlMs: number;
}

export const DEFAULT_EVENT_STORE_READ_CONFIG: EventStoreReadConfig = {
  pageSize: 100,
  enableLazyLoading: true,
  enableSnapshotAssist: true,
  cacheMaxStreams: 50,
  cacheTtlMs: 30000,
};

export interface MetricsCollectorConfig {
  readonly windowSizeMs: number;
  readonly latencyBucketCount: number;
  readonly maxSnapshotHistory: number;
}

export const DEFAULT_METRICS_CONFIG: MetricsCollectorConfig = {
  windowSizeMs: 60000,
  latencyBucketCount: 10,
  maxSnapshotHistory: 60,
};
