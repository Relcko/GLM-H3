export { DistributionBatchEngine } from "./distribution-batch-engine";
export type { BatchResult } from "./distribution-batch-engine";

export { ParallelExecutionCoordinator } from "./parallel-execution-coordinator";
export type { WorkItem, WorkResult, WorkExecutor, ExecutionReport } from "./parallel-execution-coordinator";

export { BackpressureController } from "./backpressure-controller";
export type { BackpressureAction, BackpressureDecision, BackpressureEvent } from "./backpressure-controller";

export { ProjectionPerformanceOptimizer } from "./projection-performance-optimizer";
export type { BulkWriteResult } from "./projection-performance-optimizer";

export { EventStoreReadOptimizer } from "./event-store-read-optimizer";
export type { PageResult, IncrementalReplayResult } from "./event-store-read-optimizer";

export { PerformanceMetricsCollector } from "./performance-metrics-collector";

export {
  DEFAULT_BATCH_CONFIG,
  DEFAULT_PARALLELISM_CONFIG,
  DEFAULT_BACKPRESSURE_CONFIG,
  DEFAULT_PROJECTION_CACHE_CONFIG,
  DEFAULT_EVENT_STORE_READ_CONFIG,
  DEFAULT_METRICS_CONFIG,
} from "./types";

export type {
  ThroughputSnapshot,
  LatencySnapshot,
  QueueDepthSnapshot,
  PerformanceMetricsReport,
  BatchStats,
  BatchConfig,
  ParallelismConfig,
  BackpressureConfig,
  ProjectionCacheConfig,
  EventStoreReadConfig,
  MetricsCollectorConfig,
} from "./types";
