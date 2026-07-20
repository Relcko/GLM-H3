import type { EventBus, RelckoEventEnvelope } from "@relcko/events";
import { HealthStatus, type LogEntry, type LogSink, type MetricTags, type Metrics } from "@relcko/observability";
import type { Logger } from "@relcko/logging";
import type { EntityId, Json } from "@relcko/types";
import { generateId, generateTraceId } from "@relcko/utils";
import type { OperationsRepository } from "./repository";
import type {
  MetricKind, MetricPoint, MonitorResult, OperationalProbe, OperationsLogRecord, OperationsModule,
  QueueSnapshot, ResourceProbe, TelemetryRecord, TraceSpanRecord, WorkerSnapshot,
} from "./types";

export function moduleFromEvent(envelope: Pick<RelckoEventEnvelope, "type" | "source">): OperationsModule {
  const name = `${envelope.source ?? ""} ${envelope.type}`;
  if (name.includes("treasury")) return "treasury";
  if (name.includes("governance")) return "governance";
  if (name.includes("investment")) return "investment";
  if (name.includes("nft")) return "nft";
  if (name.includes("ai.")) return "ai";
  if (name.includes("marketplace") || name.includes("property.") || name.includes("listing.") || name.includes("sale.")) return "marketplace";
  if (name.includes("identity")) return "identity";
  if (name.includes("portfolio")) return "portfolio";
  if (name.includes("network")) return "network";
  if (name.includes("blockchain")) return "blockchain";
  return "events";
}

export function isFailureEvent(type: string): boolean {
  return /(?:failed|failure|rejected|cancelled|expired|violation|unhealthy)$/.test(type);
}

export class MetricsEngine implements Metrics {
  constructor(private readonly repository: OperationsRepository) {}

  increment(name: string, value = 1, tags: MetricTags = {}): void { this.save(name, "counter", value, tags); }
  gauge(name: string, value: number, tags: MetricTags = {}): void { this.save(name, "gauge", value, tags); }
  record(name: string, value: number, tags: MetricTags = {}): void { this.save(name, "timing", value, tags); }
  query(name?: string, from?: string, to?: string): MetricPoint[] { return this.repository.listMetrics(name, from, to); }

  private save(name: string, kind: MetricKind, value: number, tags: MetricTags): void {
    const mod = typeof tags.module === "string" ? tags.module as OperationsModule : "system";
    this.repository.saveMetric({ id: generateId("metric") as EntityId, name, kind, value, module: mod, tags, recordedAt: new Date().toISOString() });
  }
}

export class TelemetryEngine {
  constructor(private readonly repository: OperationsRepository) {}
  record(module: OperationsModule, name: string, value: number, unit: string, metadata: Readonly<Record<string, Json>> = {}): TelemetryRecord {
    const record: TelemetryRecord = { id: generateId("telemetry") as EntityId, module, name, value, unit, metadata, recordedAt: new Date().toISOString() };
    this.repository.saveTelemetry(record);
    return record;
  }
  query(from?: string, to?: string): TelemetryRecord[] { return this.repository.listTelemetry(from, to); }
}

export class DistributedTraceModel {
  constructor(private readonly repository: OperationsRepository) {}

  start(module: OperationsModule, name: string, traceId = generateTraceId(), parentSpanId?: string, metadata: Readonly<Record<string, Json>> = {}): TraceSpanRecord {
    const span: TraceSpanRecord = {
      id: generateId("span") as EntityId, traceId, spanId: generateId("span"), parentSpanId,
      name, module, status: "running", startedAt: new Date().toISOString(), metadata,
    };
    this.repository.saveTrace(span);
    return span;
  }

  end(spanId: string, status: "completed" | "failed" = "completed", metadata: Readonly<Record<string, Json>> = {}): TraceSpanRecord | undefined {
    const span = this.repository.getTraceSpan(spanId);
    if (!span) return undefined;
    const endedAt = new Date().toISOString();
    const ended: TraceSpanRecord = { ...span, status, endedAt, durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(span.startedAt)), metadata: { ...span.metadata, ...metadata } };
    this.repository.saveTrace(ended);
    return ended;
  }

  get(traceId: string): TraceSpanRecord[] { return this.repository.listTrace(traceId); }
}

export class LogAggregationService {
  readonly sink: LogSink;
  constructor(private readonly repository: OperationsRepository, private readonly defaultModule: OperationsModule = "system") {
    this.sink = entry => this.ingest(entry);
  }
  ingest(entry: LogEntry, module = this.defaultModule): OperationsLogRecord {
    const record: OperationsLogRecord = { ...entry, id: generateId("oplog") as EntityId, module };
    this.repository.saveLog(record);
    return record;
  }
  query(from?: string, to?: string): OperationsLogRecord[] { return this.repository.listLogs(from, to); }
}

export class EventMonitoringService {
  private unsubscribe?: () => void;
  constructor(private readonly events: EventBus, private readonly repository: OperationsRepository, private readonly metrics: Metrics, private readonly logger?: Logger) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.events.subscribeAll(envelope => this.observe(envelope));
  }
  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }

observe(envelope: RelckoEventEnvelope): void {
     if (envelope.source === "relcko.operations") return;
     const moduleName = moduleFromEvent(envelope);
     const latencyMs = Math.max(0, Date.now() - Date.parse(envelope.occurredAt));
     const failed = isFailureEvent(envelope.type) || envelope.deadLettered === true;
     this.repository.saveEvent({
       eventId: envelope.eventId, type: envelope.type, module: moduleName, source: envelope.source,
       aggregateId: envelope.aggregateId, actorId: envelope.actorId,
       correlationId: envelope.correlationId, traceId: envelope.traceId,
       latencyMs, retryCount: envelope.retry?.attempts ?? 0, failed, observedAt: new Date().toISOString(),
     });
     this.metrics.increment("operations.event.throughput", 1, { module: moduleName, type: envelope.type });
     this.metrics.record("operations.event.latency", latencyMs / 1000, { module: moduleName });
     if (failed) this.metrics.increment("operations.event.failures", 1, { module: moduleName, type: envelope.type });
     if (envelope.retry?.attempts) this.metrics.increment("operations.event.retries", envelope.retry.attempts, { module: moduleName });
     this.logger?.debug("event observed", { type: envelope.type, module: moduleName, latencyMs });
   }
}

export class PerformanceMonitor {
  constructor(private readonly metrics: MetricsEngine) {}
  record(module: OperationsModule, operation: string, latencyMs: number, success: boolean): void {
    this.metrics.record("operations.performance.latency", latencyMs / 1000, { module, operation });
    this.metrics.increment(success ? "operations.performance.success" : "operations.performance.error", 1, { module, operation });
  }
}

export class QueueMonitor {
  constructor(private readonly events: EventBus, private readonly repository: OperationsRepository, private readonly metrics: MetricsEngine) {}
  inspect(queue = "event-bus"): QueueSnapshot {
    const dead = this.events.deadLetters();
    const now = Date.now();
    const snapshot: QueueSnapshot = {
      queue, depth: dead.length, retrying: dead.filter(v => v.attempts > 1).length, deadLetters: dead.length,
      oldestAgeMs: dead.length ? Math.max(...dead.map(v => Math.max(0, now - Date.parse(v.routedAt)))) : 0,
      checkedAt: new Date().toISOString(),
    };
    this.repository.saveQueue(snapshot);
    this.metrics.gauge("operations.queue.depth", snapshot.depth, { module: "queue", queue });
    this.metrics.gauge("operations.queue.dead_letters", snapshot.deadLetters, { module: "queue", queue });
    return snapshot;
  }
}

export class WorkerMonitor {
  constructor(private readonly repository: OperationsRepository, private readonly metrics: MetricsEngine) {}
  heartbeat(worker: string, input: Omit<WorkerSnapshot, "worker" | "heartbeatAt">): WorkerSnapshot {
    const snapshot: WorkerSnapshot = { worker, ...input, heartbeatAt: new Date().toISOString() };
    this.repository.saveWorker(snapshot);
    this.metrics.gauge("operations.worker.active_jobs", snapshot.activeJobs, { module: "worker", worker });
    this.metrics.gauge("operations.worker.failures", snapshot.failedJobs, { module: "worker", worker });
    return snapshot;
  }
}

export class ResourceMonitor implements OperationalProbe {
  constructor(readonly module: OperationsModule, private readonly probe: ResourceProbe, private readonly unhealthyMetric?: string, private readonly unhealthyThreshold = Number.POSITIVE_INFINITY) {}
  async check(): Promise<MonitorResult> {
    const values = await this.probe.read();
    const unhealthy = this.unhealthyMetric !== undefined && (values[this.unhealthyMetric] ?? 0) >= this.unhealthyThreshold;
    return {
      module: this.module, status: unhealthy ? HealthStatus.Unhealthy : HealthStatus.Healthy,
      metrics: Object.entries(values).map(([name, value]) => ({ name: `operations.${this.module}.${name}`, kind: "gauge", value, module: this.module, tags: { module: this.module } })),
      detail: unhealthy ? `${this.unhealthyMetric} threshold breached` : undefined,
      checkedAt: new Date().toISOString(),
    };
  }
}

export class SystemMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("system", probe, "memoryUsage", 0.95); } }
export class ApiMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("api", probe, "errorRate", 0.1); } }
export class DatabaseMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("database", probe, "connectionFailures", 1); } }
export class BlockchainMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("blockchain", probe, "syncLag", 20); } }
export class AiMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("ai", probe, "errorRate", 0.1); } }
export class MarketplaceMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("marketplace", probe, "errorRate", 0.1); } }
export class TreasuryMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("treasury", probe, "failures", 1); } }
export class GovernanceMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("governance", probe, "executionFailures", 1); } }
export class IdentityMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("identity", probe, "failures", 1); } }
export class PortfolioMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("portfolio", probe, "errorRate", 0.1); } }
export class NetworkMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("network", probe, "failures", 1); } }
export class InvestmentMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("investment", probe, "errorRate", 0.1); } }
export class NftMonitor extends ResourceMonitor { constructor(probe: ResourceProbe) { super("nft", probe, "errorRate", 0.1); } }

export const emptyResourceProbe: ResourceProbe = { read: () => ({}) };
