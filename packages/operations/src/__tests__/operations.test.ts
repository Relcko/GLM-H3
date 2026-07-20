import { describe, expect, it } from "vitest";
import { createAuditLog } from "@relcko/domain-core";
import { createEnvelope, createEventBus } from "@relcko/events";
import { PermissionError } from "@relcko/error";
import { InMemoryAuditStore } from "@relcko/audit-contracts";
import { HealthStatus, LogLevel } from "@relcko/observability";
import { Action, type AuthorizationContext } from "@relcko/permission";
import { Role } from "@relcko/types";
import type { EntityId } from "@relcko/types";
import {
  AlertEngine, AuditQueryService, InMemoryOperationsRepository, MetricsEngine, OperationsAnalytics,
  OperationsEventType, SystemHealthEngine, createOperationsModule,
} from "@relcko/operations";

const actorId = "ops_actor" as EntityId;
const admin: AuthorizationContext = { subject: { id: actorId, role: Role.Administrator } };
const investor: AuthorizationContext = { subject: { id: "investor_actor", role: Role.Investor } };

describe("operations event monitoring", () => {
  it("observes every domain through subscribeAll and records throughput, failures, latency and trace IDs", async () => {
    const events = createEventBus();
    const operations = createOperationsModule({ events });
    await events.publish(createEnvelope({
      type: "treasury.dividend_rejected", aggregateId: "dividend_1" as EntityId,
      actorId, payload: { reason: "balance" }, source: "relcko.treasury",
    }));

    const monitored = operations.operations.events(admin) as ReturnType<InMemoryOperationsRepository["listEvents"]>;
    expect(monitored).toHaveLength(1);
    expect(monitored[0]).toMatchObject({ module: "treasury", failed: true, type: "treasury.dividend_rejected" });
    expect(monitored[0].traceId).toBeTruthy();
    expect(operations.metrics.query("operations.event.throughput")).toHaveLength(1);
    operations.eventMonitoring.stop();
  });

  it("does not recursively observe operations events", async () => {
    const operations = createOperationsModule();
    await operations.events.publish(createEnvelope({ type: OperationsEventType.HealthChecked, aggregateId: "health_1" as EntityId, actorId, payload: {}, source: "relcko.operations" }));
    expect(operations.operations.events(admin)).toHaveLength(0);
  });
});

describe("metrics, telemetry, tracing and logs", () => {
  it("stores metrics and telemetry", () => {
    const operations = createOperationsModule({ autoStart: false });
    operations.metrics.increment("requests", 2, { module: "api" });
    operations.telemetry.record("system", "memoryUsage", 0.4, "ratio");
    expect(operations.metrics.query("requests")[0]).toMatchObject({ value: 2, module: "api" });
    expect(operations.telemetry.query()[0]).toMatchObject({ name: "memoryUsage", unit: "ratio" });
  });

  it("models parent-child traces and closes spans with duration", () => {
    const operations = createOperationsModule({ autoStart: false });
    const root = operations.tracing.start("api", "request");
    const child = operations.tracing.start("database", "query", root.traceId, root.spanId);
    operations.tracing.end(child.spanId);
    operations.tracing.end(root.spanId);
    const spans = operations.tracing.get(root.traceId);
    expect(spans).toHaveLength(2);
    expect(spans[1]).toMatchObject({ parentSpanId: root.spanId, status: "completed" });
    expect(spans[1].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("provides a log sink and queryable aggregation", () => {
    const operations = createOperationsModule({ autoStart: false });
    operations.logs.sink({ level: LogLevel.Error, time: new Date().toISOString(), message: "boom", traceId: "trace_1" });
    expect(operations.operations.logs(admin)).toHaveLength(1);
    expect((operations.operations.logs(admin)[0] as { traceId?: string }).traceId).toBe("trace_1");
  });
});

describe("health and monitors", () => {
  it("aggregates all configured module probes and emits a health event", async () => {
    const events = createEventBus();
    const received: string[] = [];
    events.subscribe(OperationsEventType.HealthChecked, event => { received.push(event.type); });
    const operations = createOperationsModule({ events, autoStart: false, probes: {
      system: { read: () => ({ cpuUsage: 0.4, memoryUsage: 0.5, storageUsage: 0.3 }) },
      database: { read: () => ({ connectionFailures: 1, latencyMs: 12 }) },
      blockchain: { read: () => ({ syncLag: 2 }) },
    } });
    const health = await operations.health.check();
    expect(health.status).toBe(HealthStatus.Unhealthy);
    expect(health.modules.some(v => v.module === "database" && v.status === HealthStatus.Unhealthy)).toBe(true);
    expect(received).toEqual([OperationsEventType.HealthChecked]);
  });

  it("converts probe exceptions to unhealthy health records", async () => {
    const repository = new InMemoryOperationsRepository();
    const events = createEventBus();
    const health = new SystemHealthEngine(repository, new MetricsEngine(repository), events);
    health.register({ module: "api", check: () => { throw new Error("offline"); } });
    expect((await health.check()).modules[0]).toMatchObject({ status: HealthStatus.Unhealthy, detail: "offline" });
  });
});

describe("queues, workers and performance", () => {
  it("measures dead-letter queue growth and worker failures", async () => {
    const events = createEventBus({ maxAttempts: 1 });
    events.subscribe("job", () => { throw new Error("poison"); });
    const operations = createOperationsModule({ events, autoStart: false });
    await events.publish(createEnvelope({ type: "job", aggregateId: "job_1" as EntityId, actorId, payload: {} }));
    const queue = operations.queues.inspect();
    expect(queue).toMatchObject({ depth: 1, deadLetters: 1 });
    const worker = operations.workers.heartbeat("worker-1", { running: true, activeJobs: 2, completedJobs: 8, failedJobs: 1 });
    expect(worker.failedJobs).toBe(1);
    operations.performance.record("api", "GET /health", 50, true);
    expect(operations.metrics.query("operations.performance.latency")[0].value).toBe(0.05);
  });
});

describe("alert flow", () => {
  it("supports thresholds, repeated failures, deduplication, acknowledgement and resolution", async () => {
    const repository = new InMemoryOperationsRepository();
    const events = createEventBus();
    const emitted: string[] = [];
    events.subscribeAll(event => { emitted.push(event.type); });
    const alerts = new AlertEngine(repository, events);
    const rule = { id: "queue_rule" as EntityId, name: "Queue backlog", metric: "queue.depth", module: "queue" as const, operator: "gte" as const, threshold: 10, severity: "critical" as const, consecutiveBreaches: 2, enabled: true };
    alerts.addRule(rule);
    expect(await alerts.evaluate(rule, 12)).toBeUndefined();
    const alert = await alerts.evaluate(rule, 14);
    expect(alert?.status).toBe("open");
    expect(await alerts.evaluate(rule, 16)).toEqual(alert);
    expect((await alerts.acknowledge(alert!.id, actorId)).status).toBe("acknowledged");
    expect((await alerts.resolve(alert!.id, actorId)).status).toBe("resolved");
    expect(emitted).toEqual([OperationsEventType.AlertOpened, OperationsEventType.AlertAcknowledged, OperationsEventType.AlertResolved]);
  });
});

describe("authorized audit query", () => {
  it("filters by time, actor, correlation, trace, module and severity", async () => {
    const audit = new InMemoryAuditStore();
    const entry = createAuditLog({
      actorId, action: "operations.alert_opened", entityType: "payment", entityId: "alert_1" as EntityId,
      after: { correlationId: "corr_1", traceId: "trace_1", module: "treasury", severity: "critical" },
    });
    await audit.write(entry);
    const operations = createOperationsModule({ audit, autoStart: false });
    const found = await operations.auditQuery.query(admin, { actorId, correlationId: "corr_1", traceId: "trace_1", module: "treasury", severity: "critical", limit: 10 });
    expect(found).toEqual([entry]);
  });

  it("denies unauthorized roles", async () => {
    const operations = createOperationsModule({ autoStart: false });
    await expect(operations.auditQuery.query(investor, {})).rejects.toThrow(PermissionError);
    expect(() => operations.operations.metrics(investor)).toThrow(PermissionError);
  });
});

describe("analytics, incidents, reports and dashboard", () => {
  it("computes operations analytics and produces an authorized dashboard", async () => {
    const operations = createOperationsModule({ probes: { system: { read: () => ({ memoryUsage: 0.2 }) } } });
    await operations.events.publish(createEnvelope({ type: "treasury.dividend_rejected", aggregateId: "model_1" as EntityId, actorId, payload: {}, source: "relcko.treasury" }));
    operations.queues.inspect();
    const analytics = operations.analytics.compute("2026-07");
    expect(analytics).toMatchObject({ eventThroughput: 1, errorRate: 1 });
    const dashboard = await operations.dashboard.snapshot(admin, "2026-07");
    expect(dashboard.health.modules.length).toBeGreaterThan(10);
    operations.eventMonitoring.stop();
  });

  it("tracks incident chronology and generates a health report", async () => {
    const operations = createOperationsModule({ autoStart: false });
    const incident = await operations.incidents.create("Treasury failure", "critical", "treasury", actorId);
    operations.incidents.addEntry(incident.id, "investigating", "Ledger inspected", actorId, "corr_1", "trace_1");
    await operations.incidents.resolve(incident.id, actorId);
    expect(operations.incidents.get(incident.id).map(v => v.type)).toEqual(["created", "investigating", "resolved"]);
    const health = await operations.health.check();
    const report = await operations.reports.generate(health, operations.analytics.compute("2026-07"));
    expect(report.content).toMatchObject({ status: "healthy" });
  });
});
