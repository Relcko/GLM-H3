import type { IClock } from "../infrastructure/services/clock";
import {
  type ThroughputSnapshot,
  type LatencySnapshot,
  type QueueDepthSnapshot,
  type PerformanceMetricsReport,
  type MetricsCollectorConfig,
  DEFAULT_METRICS_CONFIG,
} from "./types";

interface LatencyBucket {
  readonly min: number;
  readonly max: number;
  count: number;
}

interface SlidingWindowEntry {
  readonly timestamp: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly isRetry: boolean;
}

export class PerformanceMetricsCollector {
  private readonly _entries: SlidingWindowEntry[] = [];
  private readonly _latencyBuckets: LatencyBucket[];
  private _activeWorkers = 0;
  private _peakActiveWorkers = 0;
  private _currentQueueDepth = 0;
  private _peakQueueDepth = 0;
  private _queueLimit = 100;
  private _startTime: number;
  private _totalProcessingTimeMs = 0;

  constructor(
    private readonly config: MetricsCollectorConfig = DEFAULT_METRICS_CONFIG,
    private readonly clock: IClock,
  ) {
    this._startTime = this.clock.nowMs();
    this._latencyBuckets = this.createBuckets(config.latencyBucketCount);
  }

  get totalEntries(): number {
    return this._entries.length;
  }

  get elapsedMs(): number {
    return this.clock.nowMs() - this._startTime;
  }

  recordOperation(latencyMs: number, success: boolean, isRetry: boolean = false): void {
    this.pruneWindow();
    this._entries.push({
      timestamp: this.clock.nowMs(),
      latencyMs,
      success,
      isRetry,
    });
    this._totalProcessingTimeMs += latencyMs;
    this.recordLatency(latencyMs);
  }

  setActiveWorkers(count: number): void {
    this._activeWorkers = count;
    if (count > this._peakActiveWorkers) {
      this._peakActiveWorkers = count;
    }
  }

  setQueueDepth(depth: number, limit?: number): void {
    this._currentQueueDepth = depth;
    if (depth > this._peakQueueDepth) {
      this._peakQueueDepth = depth;
    }
    if (limit !== undefined) {
      this._queueLimit = limit;
    }
  }

  getThroughput(): ThroughputSnapshot {
    this.pruneWindow();
    const windowEnd = this.clock.nowMs();
    const windowStart = windowEnd - this.config.windowSizeMs;
    const inWindow = this._entries.filter(
      (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd,
    );
    const totalOps = inWindow.length;
    const errorCount = inWindow.filter((e) => !e.success).length;
    const elapsedSec = this.config.windowSizeMs / 1000;
    return {
      opsPerSecond: elapsedSec > 0 ? totalOps / elapsedSec : 0,
      windowStartMs: windowStart,
      windowEndMs: windowEnd,
      totalOps,
      errorCount,
    };
  }

  getLatency(): LatencySnapshot {
    this.pruneWindow();
    const windowEnd = this.clock.nowMs();
    const windowStart = windowEnd - this.config.windowSizeMs;
    const inWindow = this._entries
      .filter((e) => e.timestamp >= windowStart && e.timestamp <= windowEnd)
      .map((e) => e.latencyMs)
      .sort((a, b) => a - b);

    if (inWindow.length === 0) {
      return {
        minMs: 0,
        maxMs: 0,
        avgMs: 0,
        p50Ms: 0,
        p90Ms: 0,
        p99Ms: 0,
        sampleCount: 0,
      };
    }

    const sum = inWindow.reduce((a, b) => a + b, 0);
    return {
      minMs: inWindow[0] ?? 0,
      maxMs: inWindow[inWindow.length - 1] ?? 0,
      avgMs: sum / inWindow.length,
      p50Ms: this.percentile(inWindow, 0.5),
      p90Ms: this.percentile(inWindow, 0.9),
      p99Ms: this.percentile(inWindow, 0.99),
      sampleCount: inWindow.length,
    };
  }

  getQueueDepth(): QueueDepthSnapshot {
    return {
      current: this._currentQueueDepth,
      peak: this._peakQueueDepth,
      limit: this._queueLimit,
      utilizationRatio:
        this._queueLimit > 0 ? this._currentQueueDepth / this._queueLimit : 0,
    };
  }

  getErrorRate(): number {
    this.pruneWindow();
    const windowEnd = this.clock.nowMs();
    const windowStart = windowEnd - this.config.windowSizeMs;
    const inWindow = this._entries.filter(
      (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd,
    );
    if (inWindow.length === 0) return 0;
    const errors = inWindow.filter((e) => !e.success).length;
    return errors / inWindow.length;
  }

  getRetryRate(): number {
    this.pruneWindow();
    const windowEnd = this.clock.nowMs();
    const windowStart = windowEnd - this.config.windowSizeMs;
    const inWindow = this._entries.filter(
      (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd,
    );
    if (inWindow.length === 0) return 0;
    const retries = inWindow.filter((e) => e.isRetry).length;
    return retries / inWindow.length;
  }

  generateReport(label: string): PerformanceMetricsReport {
    return {
      label,
      collectedAt: this.clock.nowMs(),
      throughput: this.getThroughput(),
      latency: this.getLatency(),
      queue: this.getQueueDepth(),
      activeWorkers: this._activeWorkers,
      errorRate: this.getErrorRate(),
      retryRate: this.getRetryRate(),
      processingTime: this._totalProcessingTimeMs,
    };
  }

  getLatencyDistribution(): readonly { min: number; max: number; count: number }[] {
    return this._latencyBuckets.map((b) => ({
      min: b.min,
      max: b.max,
      count: b.count,
    }));
  }

  reset(): void {
    this._entries.length = 0;
    this._activeWorkers = 0;
    this._peakActiveWorkers = 0;
    this._currentQueueDepth = 0;
    this._peakQueueDepth = 0;
    this._totalProcessingTimeMs = 0;
    this._startTime = this.clock.nowMs();
    const buckets = this.createBuckets(this.config.latencyBucketCount);
    this._latencyBuckets.length = 0;
    this._latencyBuckets.push(...buckets);
  }

  private pruneWindow(): void {
    const cutoff = this.clock.nowMs() - this.config.windowSizeMs;
    while (this._entries.length > 0 && (this._entries[0]?.timestamp ?? 0) < cutoff) {
      this._entries.shift();
    }
  }

  private recordLatency(latencyMs: number): void {
    for (const bucket of this._latencyBuckets) {
      if (latencyMs >= bucket.min && latencyMs < bucket.max) {
        bucket.count += 1;
        return;
      }
    }
  }

  private createBuckets(count: number): LatencyBucket[] {
    const buckets: LatencyBucket[] = [];
    for (let i = 0; i < count; i++) {
      const min = i === 0 ? 0 : Math.pow(2, i) / 2;
      const max = Math.pow(2, i);
      buckets.push({ min, max, count: 0 });
    }
    buckets.push({ min: Math.pow(2, count - 1), max: Infinity, count: 0 });
    return buckets;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
  }
}
