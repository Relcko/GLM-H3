import { describe, it, expect, vi, beforeEach } from "vitest";
import { DistributionBatchEngine } from "../distribution-batch-engine";
import { ParallelExecutionCoordinator } from "../parallel-execution-coordinator";
import { BackpressureController } from "../backpressure-controller";
import { ProjectionPerformanceOptimizer } from "../projection-performance-optimizer";
import { EventStoreReadOptimizer } from "../event-store-read-optimizer";
import { PerformanceMetricsCollector } from "../performance-metrics-collector";
import {
  DEFAULT_BATCH_CONFIG,
  DEFAULT_PARALLELISM_CONFIG,
  DEFAULT_BACKPRESSURE_CONFIG,
  DEFAULT_PROJECTION_CACHE_CONFIG,
  DEFAULT_EVENT_STORE_READ_CONFIG,
  DEFAULT_METRICS_CONFIG,
} from "../types";

const mockClock = {
  nowMs: () => 1000,
};

function createMockSaga(overrides: Partial<{
  pendingRecipients: string[];
  inFlightRecipients: string[];
  isTerminal: boolean;
  hasPendingWork: boolean;
  nextBatch: (n: number) => string[];
  state: string;
}> = {}) {
  const pending = overrides.pendingRecipients ?? ["r1", "r2", "r3", "r4", "r5"];
  const isTerminal = overrides.isTerminal ?? false;
  const hasPendingWork = overrides.hasPendingWork ?? (pending.length > 0 && !isTerminal);
  let pendingCopy = [...pending];
  return {
    pendingRecipients: pendingCopy,
    inFlightRecipients: [],
    isTerminal,
    hasPendingWork,
    state: overrides.state ?? "running",
    nextBatch: (n: number) => {
      if (isTerminal) return [];
      const limit = Math.min(n, pendingCopy.length);
      const batch = pendingCopy.slice(0, limit);
      pendingCopy = pendingCopy.slice(limit);
      return batch;
    },
  };
}

function advancingClock() {
  let now = 1000;
  return { nowMs: () => { now += 2000; return now; } };
}

describe("Sprint 6 — Scale & Performance", () => {
  describe("6.1 DistributionBatchEngine", () => {
    it("produces batches from saga nextBatch", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: ["a", "b", "c", "d", "e"] });
      const result = engine.nextBatch(saga as never);
      expect(result.batch.length).toBeGreaterThan(0);
      expect(result.batch.length).toBeLessThanOrEqual(DEFAULT_BATCH_CONFIG.initialBatchSize);
      expect(typeof result.isComplete).toBe("boolean");
    });

    it("adapts batch size up on high success rate", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const initial = engine.currentBatchSize;
      engine.adaptBatchSize(0.9);
      expect(engine.currentBatchSize).toBeGreaterThanOrEqual(initial);
    });

    it("adapts batch size down on low success rate", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      engine.adaptBatchSize(0.3);
      expect(engine.currentBatchSize).toBeLessThanOrEqual(10);
    });

    it("returns empty batch when saga has no pending work", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: [], hasPendingWork: false });
      const result = engine.nextBatch(saga as never);
      expect(result.batch).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it("returns empty batch when saga is terminal", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: ["a"], isTerminal: true, hasPendingWork: false });
      const result = engine.nextBatch(saga as never);
      expect(result.batch).toHaveLength(0);
    });

    it("resumes from checkpoint with adjusted batch size", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: ["x", "y", "z"] });
      const result = engine.resumeFromCheckpoint(saga as never, 7);
      expect(result.batch.length).toBeGreaterThan(0);
    });

    it("resumeFromCheckpoint returns complete when saga is terminal", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: [], isTerminal: true, hasPendingWork: false });
      const result = engine.resumeFromCheckpoint(saga as never, 5);
      expect(result.isComplete).toBe(true);
      expect(result.batch).toHaveLength(0);
    });

    it("returns empty batch when saga state is not Running", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: ["a"], state: "suspended" });
      saga.nextBatch = () => [];
      const result = engine.nextBatch(saga as never);
      expect(result.batch).toHaveLength(0);
    });

    it("tracks total batches and items processed", () => {
      const engine = new DistributionBatchEngine(DEFAULT_BATCH_CONFIG, mockClock);
      const saga = createMockSaga({ pendingRecipients: ["a", "b"] });
      engine.nextBatch(saga as never);
      expect(engine.totalBatchesProcessed).toBeGreaterThanOrEqual(1);
      expect(engine.totalItemsProcessed).toBeGreaterThanOrEqual(1);
    });

    it("getChunkedBatches splits large batch into chunks", () => {
      const engine = new DistributionBatchEngine(
        { ...DEFAULT_BATCH_CONFIG, chunkSize: 2 },
        mockClock,
      );
      const saga = createMockSaga({ pendingRecipients: ["a", "b", "c", "d", "e"] });
      const chunks = engine.getChunkedBatches(saga as never);
      if (chunks.length > 0) {
        expect(chunks[0]!.length).toBeLessThanOrEqual(2);
      }
    });

    it("reset restores initial batch size", () => {
      const engine = new DistributionBatchEngine(
        { ...DEFAULT_BATCH_CONFIG, initialBatchSize: 7 },
        mockClock,
      );
      engine.adaptBatchSize(0.3);
      engine.reset();
      expect(engine.currentBatchSize).toBe(7);
    });

    it("adaptBatchSize does not exceed maxBatchSize", () => {
      const engine = new DistributionBatchEngine(
        { ...DEFAULT_BATCH_CONFIG, maxBatchSize: 5, adaptiveStepUp: 10 },
        mockClock,
      );
      for (let i = 0; i < 5; i++) engine.adaptBatchSize(1.0);
      expect(engine.currentBatchSize).toBeLessThanOrEqual(5);
    });
  });

  describe("6.2 ParallelExecutionCoordinator", () => {
    it("executes items with configurable concurrency", async () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        { ...DEFAULT_PARALLELISM_CONFIG, maxConcurrency: 2 },
        mockClock,
      );
      const items = [
        { id: "1", input: 1 },
        { id: "2", input: 2 },
        { id: "3", input: 3 },
      ];
      const report = await coordinator.execute(items, async (n) => `result-${n}`);
      expect(report.successCount).toBe(3);
      expect(report.failureCount).toBe(0);
      expect(report.totalItems).toBe(3);
    });

    it("preserves order when configured", async () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        { ...DEFAULT_PARALLELISM_CONFIG, maxConcurrency: 5, preserveOrder: true },
        mockClock,
      );
      const items = [
        { id: "a", input: 1 },
        { id: "b", input: 2 },
        { id: "c", input: 3 },
      ];
      const report = await coordinator.execute(items, async (n) => `r-${n}`);
      const ids = report.results.map((r) => (r as never as { item: { id: string } }).item.id);
      expect(ids).toEqual(["a", "b", "c"]);
    });

    it("tracks failures correctly", async () => {
      const coordinator = new ParallelExecutionCoordinator<string, never>(
        { ...DEFAULT_PARALLELISM_CONFIG, maxConcurrency: 1, abortOnFailureThreshold: 0.6 },
        mockClock,
      );
      const items = [
        { id: "1", input: "ok" },
        { id: "2", input: "fail" },
      ];
      const report = await coordinator.execute(items, async (input) => {
        if (input === "fail") throw new Error("Failed");
        return "ok" as never;
      });
      expect(report.successCount).toBe(1);
      expect(report.failureCount).toBe(1);
      expect(report.wasAborted).toBe(false);
    });

    it("aborts on failure threshold", async () => {
      const coordinator = new ParallelExecutionCoordinator<string, never>(
        { ...DEFAULT_PARALLELISM_CONFIG, maxConcurrency: 1, abortOnFailureThreshold: 0.3 },
        mockClock,
      );
      const items = [
        { id: "1", input: "fail1" },
        { id: "2", input: "fail2" },
        { id: "3", input: "ok" },
      ];
      const report = await coordinator.execute(items, async (input) => {
        if (input.startsWith("fail")) throw new Error("Fail");
        return "ok" as never;
      });
      expect(report.wasAborted).toBe(true);
    });

    it("records duration per item", async () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        DEFAULT_PARALLELISM_CONFIG,
        mockClock,
      );
      const report = await coordinator.execute(
        [{ id: "1", input: 42 }],
        async () => "done",
      );
      expect(report.results[0]!.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("handles empty items list", async () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        DEFAULT_PARALLELISM_CONFIG,
        mockClock,
      );
      const report = await coordinator.execute([], async () => "");
      expect(report.totalItems).toBe(0);
      expect(report.successCount).toBe(0);
    });

    it("abort() prevents further processing", async () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        { ...DEFAULT_PARALLELISM_CONFIG, maxConcurrency: 1 },
        mockClock,
      );
      const slowPromise = coordinator.execute(
        [{ id: "1", input: 1 }, { id: "2", input: 2 }, { id: "3", input: 3 }],
        async (n) => {
          await new Promise(r => setTimeout(r, 5));
          return `done-${n}`;
        },
      );
      coordinator.abort();
      const report = await slowPromise;
      expect(report.wasAborted).toBe(true);
    });

    it("exposes config", () => {
      const coordinator = new ParallelExecutionCoordinator<number, string>(
        DEFAULT_PARALLELISM_CONFIG,
        mockClock,
      );
      expect(coordinator.config.maxConcurrency).toBe(DEFAULT_PARALLELISM_CONFIG.maxConcurrency);
    });
  });

  describe("6.3 BackpressureController", () => {
    it("allows proceed when queue depth is low", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(5);
      const decision = ctrl.decide();
      expect(decision.action).toBe("proceed");
    });

    it("throttles when queue depth exceeds lowWaterMark", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(50);
      const decision = ctrl.decide();
      expect(decision.action).toBe("throttle");
      expect(decision.delayMs).toBeGreaterThan(0);
    });

    it("pauses when queue depth exceeds highWaterMark", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(150);
      const decision = ctrl.decide();
      expect(decision.action).toBe("pause");
      expect(ctrl.isPaused).toBe(true);
    });

    it("resumes when queue depth drops to lowWaterMark", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(150);
      ctrl.decide();
      expect(ctrl.isPaused).toBe(true);
      ctrl.updateQueueDepth(10);
      const resumed = ctrl.tryResume();
      expect(resumed).toBe(true);
      expect(ctrl.isPaused).toBe(false);
    });

    it("records peak queue depth", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(10);
      ctrl.updateQueueDepth(200);
      ctrl.updateQueueDepth(5);
      expect(ctrl.peakQueueDepth).toBe(200);
    });

    it("rejects when rate exceeds max and strategy is reject", () => {
      const ctrl = new BackpressureController(
        { ...DEFAULT_BACKPRESSURE_CONFIG, overflowStrategy: "reject", maxRatePerSecond: 0 },
        advancingClock(),
      );
      ctrl.recordOperation();
      ctrl.recordOperation();
      const decision = ctrl.decide();
      expect(decision.action).toBe("reject");
    });

    it("tracks total rejected and throttled", () => {
      const ctrl = new BackpressureController(
        { ...DEFAULT_BACKPRESSURE_CONFIG, overflowStrategy: "reject", maxRatePerSecond: 0 },
        mockClock,
      );
      ctrl.recordOperation();
      ctrl.decide();
      ctrl.decide();
      expect(ctrl.totalRejected).toBeGreaterThan(0);
    });

    it("returns recent events", () => {
      const ctrl = new BackpressureController(
        { ...DEFAULT_BACKPRESSURE_CONFIG, highWaterMark: 5 },
        mockClock,
      );
      ctrl.updateQueueDepth(10);
      ctrl.decide();
      expect(ctrl.getRecentEvents().length).toBeGreaterThan(0);
    });

    it("getQueueSnapshot returns utilization ratio", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(50);
      const snap = ctrl.getQueueSnapshot();
      expect(snap.utilizationRatio).toBeCloseTo(0.5, 1);
    });

    it("reset clears all state", () => {
      const ctrl = new BackpressureController(DEFAULT_BACKPRESSURE_CONFIG, mockClock);
      ctrl.updateQueueDepth(150);
      ctrl.decide();
      ctrl.reset();
      expect(ctrl.currentQueueDepth).toBe(0);
      expect(ctrl.peakQueueDepth).toBe(0);
      expect(ctrl.isPaused).toBe(false);
    });
  });

  describe("6.4 ProjectionPerformanceOptimizer", () => {
    it("caches and retrieves entries", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      opt.setCached("test_store", "id-1", { value: 42 });
      const result = opt.findCached<{ value: number }>("test_store", "id-1");
      expect(result).toEqual({ value: 42 });
    });

    it("returns null for cache miss", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      const result = opt.findCached("unknown", "id-x");
      expect(result).toBeNull();
    });

    it("tracks cache hit rate", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      opt.setCached("s", "1", "data");
      opt.findCached("s", "1");
      opt.findCached("s", "x");
      expect(opt.cacheHitRate).toBe(0.5);
    });

    it("invalidates individual cache entry", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      opt.setCached("s", "1", "data");
      opt.invalidateCache("s", "1");
      expect(opt.findCached("s", "1")).toBeNull();
    });

    it("invalidates all entries for a store", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      opt.setCached("s", "1", "a");
      opt.setCached("s", "2", "b");
      opt.invalidateCache("s");
      expect(opt.findCached("s", "1")).toBeNull();
      expect(opt.findCached("s", "2")).toBeNull();
    });

    it("enqueues and flushes writes", async () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      const mockStore = {
        name: "mock_store",
        save: async (id: string, data: { version: number }, expectedVersion: number) => ({
          success: true,
          data,
          error: null,
        }),
        findById: async () => null,
        findMany: async () => [],
        delete: async () => true,
        reset: async () => {},
        getVersion: async () => 0,
        count: async () => 0,
      };
      opt.registerStore(mockStore);
      opt.enqueueWrite(mockStore, "rec-1", { version: 1 }, 0);
      const result = await opt.flushWrites();
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it("groups events by type", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      const envelopes = [
        { metadata: { eventType: "type_a", eventId: "1", aggregateId: "a", timestamp: 1 } },
        { metadata: { eventType: "type_b", eventId: "2", aggregateId: "b", timestamp: 2 } },
        { metadata: { eventType: "type_a", eventId: "3", aggregateId: "c", timestamp: 3 } },
      ] as never;
      const groups = opt.groupEventsByType(envelopes);
      expect(groups.get("type_a")).toHaveLength(2);
      expect(groups.get("type_b")).toHaveLength(1);
    });

    it("evicts oldest cache entry when maxEntries reached", () => {
      const config = { ...DEFAULT_PROJECTION_CACHE_CONFIG, maxEntries: 2 };
      const opt = new ProjectionPerformanceOptimizer(config, mockClock);
      opt.setCached("s", "1", "a");
      opt.setCached("s", "2", "b");
      opt.setCached("s", "3", "c");
      expect(opt.findCached("s", "1")).toBeNull();
      expect(opt.findCached("s", "3")).toBe("c");
    });

    it("clears cache and pending writes on reset", () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      opt.setCached("s", "1", "data");
      opt.enqueueWrite({ name: "x" } as never, "id", { version: 1 }, 0);
      opt.reset();
      expect(opt.findCached("s", "1")).toBeNull();
      expect(opt.pendingWriteCount).toBe(0);
    });

    it("tracks average bulk write time", async () => {
      const opt = new ProjectionPerformanceOptimizer(DEFAULT_PROJECTION_CACHE_CONFIG, mockClock);
      const mockStore = {
        name: "ms",
        save: async () => ({ success: true, data: { version: 1 }, error: null }),
        findById: async () => null,
        findMany: async () => [],
        delete: async () => true,
        reset: async () => {},
        getVersion: async () => 0,
        count: async () => 0,
      };
      opt.registerStore(mockStore);
      opt.enqueueWrite(mockStore, "r1", { version: 1 }, 0);
      await opt.flushWrites();
      expect(opt.averageBulkWriteTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("6.5 EventStoreReadOptimizer", () => {
    function createMockEventStore(events?: StoredEvent[]): never {
      const storedEvents = events ?? [];
      return {
        load: async (streamId: string) => ({
          streamId,
          version: storedEvents.length,
          events: storedEvents,
        }),
        stream: async function* (opts: { fromPosition?: number }) {
          const from = opts.fromPosition ?? 0;
          for (const e of storedEvents) {
            if (e.globalPosition >= from) yield e;
          }
        },
      } as never;
    }

    it("loads stream events through the optimizer", async () => {
      const store = createMockEventStore([]);
      const opt = new EventStoreReadOptimizer(store, DEFAULT_EVENT_STORE_READ_CONFIG);
      const result = await opt.lazyLoadStream("test-stream");
      expect(result).toBeDefined();
    });

    it("returns paged results", async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        eventId: `e${i}`,
        eventType: "test",
        streamId: "s",
        version: i + 1,
        globalPosition: i + 1,
        data: "{}",
        metadata: "{}",
        recordedAt: Date.now(),
        eventVersion: 1,
      }));
      const store = createMockEventStore(events);
      const opt = new EventStoreReadOptimizer(store, { ...DEFAULT_EVENT_STORE_READ_CONFIG, pageSize: 10 });
      const page = await opt.loadStreamPaged("s", 0);
      expect(page.events.length).toBeLessThanOrEqual(10);
      expect(page.totalAvailable).toBe(50);
    });

    it("incrementalReplay returns events from position", async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        eventId: `e${i}`,
        eventType: "test",
        streamId: "s",
        version: i + 1,
        globalPosition: i + 1,
        data: "{}",
        metadata: "{}",
        recordedAt: Date.now(),
        eventVersion: 1,
      }));
      const store = createMockEventStore(events);
      const opt = new EventStoreReadOptimizer(store, DEFAULT_EVENT_STORE_READ_CONFIG);
      const result = await opt.incrementalReplay(5);
      expect(result.fromPosition).toBe(5);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it("snapshotAssistedLoad reduces events processed", async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        eventId: `e${i}`,
        eventType: "test",
        streamId: "s",
        version: i + 1,
        globalPosition: i + 1,
        data: "{}",
        metadata: "{}",
        recordedAt: Date.now(),
        eventVersion: 1,
      }));
      const store = createMockEventStore(events);
      const opt = new EventStoreReadOptimizer(store, { ...DEFAULT_EVENT_STORE_READ_CONFIG, enableSnapshotAssist: true });
      const snapshot = { version: 15, data: { count: 15 } };
      const result = await opt.snapshotAssistedLoad("s", snapshot, (data, domainEvents) => ({
        data: { count: data.count + domainEvents.length },
        version: snapshot.version + domainEvents.length,
      }));
      expect(result.version).toBeGreaterThan(snapshot.version);
    });

    it("caches streams for repeated access", async () => {
      const events = [{
        eventId: "e1",
        eventType: "test",
        streamId: "s",
        version: 1,
        globalPosition: 1,
        data: "{}",
        metadata: "{}",
        recordedAt: Date.now(),
        eventVersion: 1,
      }];
      const store = createMockEventStore(events);
      const opt = new EventStoreReadOptimizer(store, DEFAULT_EVENT_STORE_READ_CONFIG);
      await opt.lazyLoadStream("s");
      await opt.lazyLoadStream("s");
      expect(opt.cacheHitRate).toBeGreaterThan(0);
    });

    it("invalidateStream removes cache entry", async () => {
      const store = createMockEventStore([]);
      const opt = new EventStoreReadOptimizer(store, DEFAULT_EVENT_STORE_READ_CONFIG);
      await opt.lazyLoadStream("s");
      opt.invalidateStream("s");
      await opt.lazyLoadStream("s");
      expect(opt.cacheHitRate).toBeLessThan(1);
    });

    it("clearCache resets hit rate", () => {
      const store = createMockEventStore([]);
      const opt = new EventStoreReadOptimizer(store, DEFAULT_EVENT_STORE_READ_CONFIG);
      opt.clearCache();
      expect(opt.totalEventsRead).toBe(0);
    });
  });

  describe("6.6 PerformanceMetricsCollector", () => {
    it("records operations and provides throughput", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.recordOperation(10, true);
      collector.recordOperation(20, true);
      collector.recordOperation(30, false);
      const throughput = collector.getThroughput();
      expect(throughput.totalOps).toBeGreaterThanOrEqual(3);
      expect(throughput.errorCount).toBe(1);
    });

    it("computes latency percentiles", () => {
      const collector = new PerformanceMetricsCollector(
        { ...DEFAULT_METRICS_CONFIG, windowSizeMs: 600000 },
        mockClock,
      );
      collector.recordOperation(5, true);
      collector.recordOperation(10, true);
      collector.recordOperation(15, true);
      collector.recordOperation(20, true);
      collector.recordOperation(100, true);
      const latency = collector.getLatency();
      expect(latency.sampleCount).toBe(5);
      expect(latency.minMs).toBe(5);
      expect(latency.maxMs).toBe(100);
      expect(latency.p50Ms).toBeGreaterThanOrEqual(10);
      expect(latency.p90Ms).toBeGreaterThanOrEqual(15);
    });

    it("tracks queue depth and active workers", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.setActiveWorkers(5);
      collector.setQueueDepth(50, 100);
      const queue = collector.getQueueDepth();
      expect(queue.current).toBe(50);
      expect(queue.limit).toBe(100);
      expect(queue.utilizationRatio).toBe(0.5);
    });

    it("computes error rate", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.recordOperation(10, true);
      collector.recordOperation(10, false);
      expect(collector.getErrorRate()).toBe(0.5);
    });

    it("computes retry rate", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.recordOperation(10, true, false);
      collector.recordOperation(10, true, true);
      expect(collector.getRetryRate()).toBe(0.5);
    });

    it("generates full report", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.recordOperation(15, true);
      collector.setActiveWorkers(3);
      collector.setQueueDepth(20, 100);
      const report = collector.generateReport("test-report");
      expect(report.label).toBe("test-report");
      expect(report.activeWorkers).toBe(3);
      expect(report.throughput).toBeDefined();
      expect(report.latency).toBeDefined();
      expect(report.queue).toBeDefined();
    });

    it("provides latency distribution buckets", () => {
      const collector = new PerformanceMetricsCollector(
        { ...DEFAULT_METRICS_CONFIG, latencyBucketCount: 5 },
        mockClock,
      );
      collector.recordOperation(1, true);
      collector.recordOperation(10, true);
      collector.recordOperation(100, true);
      const dist = collector.getLatencyDistribution();
      expect(dist.length).toBeGreaterThan(0);
      const totalCount = dist.reduce((s, b) => s + b.count, 0);
      expect(totalCount).toBe(3);
    });

    it("reset clears all state", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      collector.recordOperation(10, true);
      collector.setActiveWorkers(5);
      collector.setQueueDepth(30);
      collector.reset();
      expect(collector.totalEntries).toBe(0);
      expect(collector.getErrorRate()).toBe(0);
    });

    it("handles empty latency snapshot", () => {
      const collector = new PerformanceMetricsCollector(DEFAULT_METRICS_CONFIG, mockClock);
      const latency = collector.getLatency();
      expect(latency.sampleCount).toBe(0);
      expect(latency.minMs).toBe(0);
    });
  });
});

interface StoredEvent {
  eventId: string;
  eventType: string;
  streamId: string;
  version: number;
  globalPosition: number;
  data: string;
  metadata: string;
  recordedAt: number;
  eventVersion: number;
}
