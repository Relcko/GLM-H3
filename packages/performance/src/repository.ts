import type { EntityId, Timestamp } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type {
  CacheStats, ConcurrencySample, JobRun, LoadSimulationReport, ScalabilityMetric, WorkerTask,
} from "./types";

/**
 * In-memory store for performance-layer state and history. Holds rolling metrics
 * only — never domain business state. Designed to be cheap and lock-free for
 * the hot path; production deployments back this with a time-series store.
 */
export class InMemoryPerformanceRepository {
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;
  private rateLimitChecks = 0;
  private rateLimitRejections = 0;
  private batchesExecuted = 0;
  private batchItemsProcessed = 0;
  private eventThroughputWindow: number[] = [];
  private readonly concurrencySamples: ConcurrencySample[] = [];
  private readonly metrics: ScalabilityMetric[] = [];
  private readonly workerTasks = new Map<string, WorkerTask>();
  private readonly jobRuns = new Map<string, JobRun>();
  private readonly loadReports: LoadSimulationReport[] = [];

  // ---- Cache accounting ----
  recordCacheHit(): void { this.cacheHits++; }
  recordCacheMiss(): void { this.cacheMisses++; }
  recordCacheEviction(): void { this.cacheEvictions++; }
  resetCacheCounters(): void { this.cacheHits = 0; this.cacheMisses = 0; this.cacheEvictions = 0; }
  cacheStats(entries: number, estimatedSizeBytes: number): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    return {
      entries,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      evictions: this.cacheEvictions,
      hitRate: total ? this.cacheHits / total : 0,
      estimatedSizeBytes,
    };
  }

  // ---- Rate limit accounting ----
  recordRateLimitCheck(allowed: boolean): void {
    this.rateLimitChecks++;
    if (!allowed) this.rateLimitRejections++;
  }
  rateLimitStats(): { checks: number; rejections: number } {
    return { checks: this.rateLimitChecks, rejections: this.rateLimitRejections };
  }

  // ---- Batch accounting ----
  recordBatch(items: number): void { this.batchesExecuted++; this.batchItemsProcessed += items; }
  batchStats(): { executed: number; itemsProcessed: number } {
    return { executed: this.batchesExecuted, itemsProcessed: this.batchItemsProcessed };
  }

  // ---- Concurrency ----
  recordConcurrency(sample: ConcurrencySample): void {
    this.concurrencySamples.push(sample);
    if (this.concurrencySamples.length > 1000) this.concurrencySamples.shift();
  }
  latestConcurrency(): ConcurrencySample | undefined { return this.concurrencySamples.at(-1); }

  // ---- Event throughput ----
  recordEvent(now = Date.now()): void { this.eventThroughputWindow.push(now); }
  eventThroughputPerSec(now = Date.now()): number {
    const cutoff = now - 1000;
    this.eventThroughputWindow = this.eventThroughputWindow.filter((t) => t >= cutoff);
    return this.eventThroughputWindow.length;
  }

  // ---- Scalability metrics ----
  saveMetric(metric: ScalabilityMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > 5000) this.metrics.shift();
  }
  listMetrics(name?: string): readonly ScalabilityMetric[] {
    return name ? this.metrics.filter((m) => m.name === name) : this.metrics;
  }

  // ---- Workers ----
  saveWorkerTask(task: WorkerTask): void { this.workerTasks.set(task.id, task); }
  getWorkerTask(id: string): WorkerTask | undefined { return this.workerTasks.get(id); }
  listWorkerTasks(): readonly WorkerTask[] { return [...this.workerTasks.values()]; }

  // ---- Jobs ----
  saveJobRun(run: JobRun): void { this.jobRuns.set(run.id, run); }
  getJobRun(id: string): JobRun | undefined { return this.jobRuns.get(id); }
  listJobRuns(): readonly JobRun[] { return [...this.jobRuns.values()]; }

  // ---- Load simulation ----
  saveLoadReport(report: LoadSimulationReport): void { this.loadReports.push(report); }
  listLoadReports(): readonly LoadSimulationReport[] { return this.loadReports; }

  newId(prefix: string): EntityId { return generateId(prefix) as EntityId; }
}

export type { Timestamp };
