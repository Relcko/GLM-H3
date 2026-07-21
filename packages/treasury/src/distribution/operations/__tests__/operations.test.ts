import { describe, it, expect, vi, beforeEach } from "vitest";
import { OperationLogger } from "../operation-logger";
import { HealthCheckService, HealthState, ComponentHealthCheck } from "../health-check.service";
import { MetricsExporter } from "../metrics-exporter";
import { DeadLetterQueue } from "../dead-letter-queue";
import { LifecycleManager, LifecyclePhase } from "../lifecycle-manager";
import { DiagnosticService } from "../diagnostic.service";

const mockClock = { nowMs: () => 1000 };

function mockHealthService(): HealthCheckService {
  const hs = new HealthCheckService(mockClock);
  hs.registerCheck(new ComponentHealthCheck("ok", async () => true, mockClock));
  hs.registerCheck(new ComponentHealthCheck("ok2", async () => true, mockClock));
  return hs;
}

function mockMetricsExporter(): MetricsExporter {
  return new MetricsExporter("test", mockClock);
}

function mockDeadLetterQueue(): DeadLetterQueue {
  return new DeadLetterQueue(mockClock);
}

function mockLogger(): OperationLogger {
  return new OperationLogger({ source: "test" });
}

describe("Sprint 7 — Operations & Observability", () => {
  describe("7.1 OperationLogger", () => {
    it("creates logger with context", () => {
      const logger = new OperationLogger({ source: "test", distributionId: "dist-1" });
      expect(logger.context.source).toBe("test");
      expect(logger.context.distributionId).toBe("dist-1");
    });

    it("correlation ID propagates through child loggers", () => {
      const parent = new OperationLogger({ source: "parent" });
      const child = parent.withCorrelationId("corr-123");
      expect(child.context.correlationId).toBe("corr-123");
      expect(child.context.source).toBe("parent");
    });

    it("request ID propagates through child loggers", () => {
      const parent = new OperationLogger({});
      const child = parent.withRequestId("req-456");
      expect(child.context.requestId).toBe("req-456");
    });

    it("distribution ID propagates", () => {
      const logger = new OperationLogger({});
      const child = logger.withDistributionId("dist-abc");
      expect(child.context.distributionId).toBe("dist-abc");
    });

    it("saga ID propagates", () => {
      const logger = new OperationLogger({});
      const child = logger.withSagaId("saga-xyz");
      expect(child.context.sagaId).toBe("saga-xyz");
    });

    it("payment ID propagates", () => {
      const logger = new OperationLogger({});
      const child = logger.withPaymentId("pay-789");
      expect(child.context.paymentId).toBe("pay-789");
    });

    it("masks sensitive data like emails", () => {
      const logger = new OperationLogger({ source: "test" });
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logger.info("User email", { email: "user@example.com" });
      const output = JSON.parse(spy.mock.calls[0]![0] as string);
      expect(output.context.email).toBe("***");
      spy.mockRestore();
    });

    it("respects global log level filtering", () => {
      OperationLogger.setGlobalLevel("error");
      const logger = new OperationLogger({});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.debug("should not appear");
      logger.info("should not appear");
      expect(logSpy).not.toHaveBeenCalled();
      logger.error("should appear");
      expect(errorSpy).toHaveBeenCalled();
      logSpy.mockRestore();
      errorSpy.mockRestore();
      OperationLogger.setGlobalLevel("info");
    });

    it("outputs structured JSON", () => {
      OperationLogger.setGlobalLevel("info");
      const logger = new OperationLogger({ source: "test" });
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logger.info("test message", { extra: "data" });
      const call = spy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("test message");
      expect(parsed.context.extra).toBe("data");
      expect(parsed.timestamp).toBeDefined();
      spy.mockRestore();
    });

    it("serializes errors in error log entries", () => {
      const logger = new OperationLogger({});
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("something broke");
      logger.error("Operation failed", err);
      const call = spy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe("error");
      expect(parsed.error.message).toBe("something broke");
      expect(parsed.error.name).toBe("Error");
      spy.mockRestore();
    });

    it("child logger preserves parent context", () => {
      const parent = new OperationLogger({ source: "app", distributionId: "d-1" });
      const child = parent.child({ sagaId: "s-1" });
      expect(child.context.source).toBe("app");
      expect(child.context.distributionId).toBe("d-1");
      expect(child.context.sagaId).toBe("s-1");
    });
  });

  describe("7.2 HealthCheckService", () => {
    it("returns Ready when all checks pass", async () => {
      const hs = mockHealthService();
      const report = await hs.checkAll();
      expect(report.overall).toBe(HealthState.Ready);
      expect(report.failedCount).toBe(0);
    });

    it("returns Failed when any check fails", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("good", async () => true, mockClock));
      hs.registerCheck(new ComponentHealthCheck("bad", async () => false, mockClock));
      const report = await hs.checkAll();
      expect(report.overall).toBe(HealthState.Failed);
      expect(report.failedCount).toBe(1);
    });

    it("handles check exceptions gracefully", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("throws", async () => {
        throw new Error("Kaboom");
      }, mockClock));
      const report = await hs.checkAll();
      expect(report.overall).toBe(HealthState.Failed);
      expect(report.checks[0]!.message).toContain("Kaboom");
    });

    it("isReady returns true for Ready and Degraded", async () => {
      const hs = mockHealthService();
      expect(await hs.isReady()).toBe(true);
    });

    it("isLive returns false when all checks fail", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("fail1", async () => false, mockClock));
      expect(await hs.isLive()).toBe(false);
    });

    it("tracks latency per check", async () => {
      const hs = mockHealthService();
      const report = await hs.checkAll();
      for (const check of report.checks) {
        expect(check.latencyMs).toBeGreaterThanOrEqual(0);
      }
    });

    it("reports degraded count correctly", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("degraded", async () => {
        return true;
      }, mockClock));
      const report = await hs.checkAll();
      expect(report.degradedCount).toBe(0);
    });

    it("stores last report", async () => {
      const hs = mockHealthService();
      expect(hs.lastReport).toBeNull();
      await hs.checkAll();
      expect(hs.lastReport).not.toBeNull();
    });

    it("registers and retrieves checks by name", () => {
      const hs = new HealthCheckService(mockClock);
      const check = new ComponentHealthCheck("my_check", async () => true, mockClock);
      hs.registerCheck(check);
      expect(hs.getCheck("my_check")).toBe(check);
      expect(hs.getRegisteredChecks()).toContain("my_check");
    });
  });

  describe("7.3 MetricsExporter", () => {
    it("increments counters", () => {
      const me = mockMetricsExporter();
      me.incrementCounter("payments_success");
      expect(me.getCounterValue("payments_success")).toBe(1);
      me.incrementCounter("payments_success");
      expect(me.getCounterValue("payments_success")).toBe(2);
    });

    it("sets gauges", () => {
      const me = mockMetricsExporter();
      me.setGauge("queue_depth", 42);
      expect(me.getGaugeValue("queue_depth")).toBe(42);
      me.setGauge("queue_depth", 10);
      expect(me.getGaugeValue("queue_depth")).toBe(10);
    });

    it("records histograms", () => {
      const me = mockMetricsExporter();
      me.recordHistogram("latency_ms", 10);
      me.recordHistogram("latency_ms", 20);
      me.recordHistogram("latency_ms", 30);
      expect(me.getHistogramValues("latency_ms")).toHaveLength(3);
    });

    it("exports snapshot with all metrics", () => {
      const me = mockMetricsExporter();
      me.incrementCounter("ops_total");
      me.setGauge("workers", 5);
      const snapshot = me.exportSnapshot();
      expect(snapshot.metrics.length).toBe(2);
      expect(snapshot.source).toBe("test");
    });

    it("exports Prometheus format", () => {
      const me = mockMetricsExporter();
      me.setGauge("active_workers", 3, { service: "worker" });
      me.incrementCounter("payments_total", 10);
      const prom = me.exportPrometheus();
      expect(prom).toContain("distribution_active_workers");
      expect(prom).toContain("distribution_payments_total");
    });

    it("exports OpenTelemetry format", () => {
      const me = mockMetricsExporter();
      me.incrementCounter("test_counter", 5);
      const otel = me.exportOpenTelemetry();
      expect(otel.resourceMetrics).toBeDefined();
      expect(otel.resourceMetrics[0]!.scopeMetrics[0]!.metrics.length).toBe(1);
    });

    it("reset clears all metrics", () => {
      const me = mockMetricsExporter();
      me.incrementCounter("test", 10);
      me.setGauge("g", 5);
      me.recordHistogram("h", 1);
      me.reset();
      expect(me.getCounterValue("test")).toBe(0);
      expect(me.getGaugeValue("g")).toBe(0);
      expect(me.getHistogramValues("h")).toHaveLength(0);
    });

    it("tracks throughput and latency metrics", () => {
      const me = mockMetricsExporter();
      me.trackThroughput("payment", 100, 5000);
      expect(me.getGaugeValue("payment_throughput", { unit: "ops_per_sec"})).toBe(100);
      expect(me.getGaugeValue("payment_total_ops")).toBe(5000);
      me.trackLatency("payment", { min: 1, max: 100, avg: 50, p50: 45, p90: 90, p99: 99 });
      expect(me.getGaugeValue("payment_latency_p50", { quantile: "p50" })).toBe(45);
    });
  });

  describe("7.4 DeadLetterQueue", () => {
    it("inserts dead letter entries", () => {
      const dlq = mockDeadLetterQueue();
      const entry = dlq.insert({
        eventType: "payment.failed",
        eventId: "evt-1",
        aggregateId: "agg-1",
        payload: { amount: 100 },
        failureReason: "Gateway timeout",
        projectionName: "recipient_projection",
      });
      expect(entry.eventId).toBe("evt-1");
      expect(entry.retryCount).toBe(0);
      expect(entry.poison).toBe(false);
    });

    it("detects poison events after threshold retries", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "payment.failed", eventId: "evt-p", aggregateId: "agg-1", payload: {}, failureReason: "fail1", projectionName: "p1" });
      dlq.insert({ eventType: "payment.failed", eventId: "evt-p", aggregateId: "agg-1", payload: {}, failureReason: "fail2", projectionName: "p1" });
      dlq.insert({ eventType: "payment.failed", eventId: "evt-p", aggregateId: "agg-1", payload: {}, failureReason: "fail3", projectionName: "p1" });
      dlq.insert({ eventType: "payment.failed", eventId: "evt-p", aggregateId: "agg-1", payload: {}, failureReason: "fail4", projectionName: "p1" });
      const entry = dlq.getEntry("p1::evt-p");
      expect(entry).not.toBeNull();
      expect(entry!.poison).toBe(true);
      expect(entry!.poisonDetectedAt).not.toBeNull();
    });

    it("detectPoisonEvents marks eligible entries", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r1", projectionName: "p" });
      const before = dlq.getEntry("p::e1");
      expect(before!.poison).toBe(false);
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r2", projectionName: "p" });
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r3", projectionName: "p" });
      const afterThird = dlq.getEntry("p::e1");
      expect(afterThird!.poison).toBe(false);
      const detected = dlq.detectPoisonEvents();
      expect(detected.length).toBe(1);
      expect(detected[0]!.poison).toBe(true);
      expect(detected[0]!.poisonDetectedAt).not.toBeNull();
    });

    it("getAllEntries returns sorted entries", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "a", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      dlq.insert({ eventType: "b", eventId: "e2", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      const entries = dlq.getAllEntries();
      expect(entries).toHaveLength(2);
    });

    it("getEntriesByProjection filters correctly", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "proj_a" });
      dlq.insert({ eventType: "t", eventId: "e2", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "proj_b" });
      expect(dlq.getEntriesByProjection("proj_a")).toHaveLength(1);
    });

    it("markForReplay resets retry count", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      dlq.markForReplay("p::e1");
      const entry = dlq.getEntry("p::e1");
      expect(entry!.retryCount).toBe(0);
      expect(entry!.lastRetryAt).toBeNull();
    });

    it("removeEntry removes from queue", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      expect(dlq.removeEntry("p::e1")).toBe(true);
      expect(dlq.entryCount).toBe(0);
    });

    it("tracks poison entry count", () => {
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      dlq.insert({ eventType: "t", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "r", projectionName: "p" });
      expect(dlq.poisonEntryCount).toBe(1);
    });
  });

  describe("7.5 LifecycleManager", () => {
    it("starts in Initializing phase", () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      expect(lm.phase).toBe(LifecyclePhase.Initializing);
    });

    it("transitions to Running on successful startup", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      const report = await lm.startup();
      expect(lm.phase).toBe(LifecyclePhase.Running);
      expect(report.healthy).toBe(true);
    });

    it("transitions to Failed when startup health check fails", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("failing", async () => false, mockClock));
      const lm = new LifecycleManager(hs, mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      const report = await lm.startup();
      expect(lm.phase).toBe(LifecyclePhase.Failed);
      expect(report.healthy).toBe(false);
    });

    it("performs warmup", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      await lm.startup();
      await expect(lm.warmup()).resolves.toBeUndefined();
    });

    it("transitions through drain and flush phases on shutdown", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      await lm.startup();
      const report = await lm.shutdown();
      expect(lm.phase).toBe(LifecyclePhase.Stopped);
      expect(report.healthy).toBe(true);
    });

    it("registers and drains workers", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      lm.registerDrainable({
        name: "test_worker",
        remaining: 0,
        drain: async () => {},
      });
      await expect(lm.drainWorkers()).resolves.toBeUndefined();
    });

    it("registers and flushes flushables", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      let flushed = false;
      lm.registerFlushable({
        name: "CheckpointStore",
        flush: async () => { flushed = true; },
      });
      await expect(lm.flushCheckpoints()).resolves.toBeUndefined();
      expect(flushed).toBe(true);
    });

    it("flushProjections flushes projection flushables", async () => {
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), mockClock);
      let flushed = false;
      lm.registerFlushable({
        name: "ProjectionStore",
        flush: async () => { flushed = true; },
      });
      await lm.flushProjections();
      expect(flushed).toBe(true);
    });

    it("flushMetrics exports snapshot", async () => {
      const me = mockMetricsExporter();
      const lm = new LifecycleManager(mockHealthService(), me, mockDeadLetterQueue(), mockLogger(), mockClock);
      await expect(lm.flushMetrics()).resolves.toBeUndefined();
    });

    it("reports uptime", () => {
      let now = 1000;
      const advancing = { nowMs: () => { const t = now; now += 4000; return t; } };
      const lm = new LifecycleManager(mockHealthService(), mockMetricsExporter(), mockDeadLetterQueue(), mockLogger(), advancing);
      expect(lm.uptimeMs).toBe(4000);
    });
  });

  describe("7.6 DiagnosticService", () => {
    it("generates a diagnostic report", () => {
      const hs = mockHealthService();
      const me = mockMetricsExporter();
      const dlq = mockDeadLetterQueue();
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      expect(report.system).toBeDefined();
      expect(report.health).toBeDefined();
      expect(report.projections).toBeDefined();
      expect(report.queues).toBeDefined();
      expect(report.payments).toBeDefined();
      expect(report.security).toBeDefined();
      expect(report.deadLetter).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it("includes recovery recommendations for dead letters", () => {
      const hs = mockHealthService();
      const me = mockMetricsExporter();
      const dlq = mockDeadLetterQueue();
      dlq.insert({ eventType: "f", eventId: "e1", aggregateId: "a", payload: {}, failureReason: "err", projectionName: "p" });
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      const dlRecs = report.recommendations.filter((r) => r.component === "dead_letter_queue");
      expect(dlRecs.length).toBeGreaterThanOrEqual(1);
    });

    it("generates recovery recommendations for failed health checks", async () => {
      const hs = new HealthCheckService(mockClock);
      hs.registerCheck(new ComponentHealthCheck("failing", async () => false, mockClock));
      await hs.checkAll();
      const me = mockMetricsExporter();
      const dlq = mockDeadLetterQueue();
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      const criticalRecs = report.recommendations.filter((r) => r.severity === "critical");
      expect(criticalRecs.length).toBeGreaterThanOrEqual(1);
    });

    it("recommendations include severity, message, and action", () => {
      const hs = mockHealthService();
      const me = mockMetricsExporter();
      const dlq = mockDeadLetterQueue();
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      for (const rec of report.recommendations) {
        expect(rec.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(rec.message).toBeTruthy();
        expect(rec.action).toBeTruthy();
      }
    });

    it("computes payment success rate", () => {
      const hs = mockHealthService();
      const me = mockMetricsExporter();
      me.incrementCounter("payment_total", 10);
      me.incrementCounter("payment_success", 8);
      const dlq = mockDeadLetterQueue();
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      expect(report.batches.successRate).toBeGreaterThan(0);
    });

    it("reports system phase and uptime", () => {
      const hs = mockHealthService();
      const me = mockMetricsExporter();
      const dlq = mockDeadLetterQueue();
      const logger = mockLogger();
      const lm = new LifecycleManager(hs, me, dlq, logger, mockClock);
      const ds = new DiagnosticService(hs, me, dlq, lm, logger, mockClock);
      const report = ds.generateReport();
      expect(report.system.phase).toBeDefined();
      expect(report.system.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
