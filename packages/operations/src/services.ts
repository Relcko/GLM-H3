import type { AuditLog, AuditReader } from "@relcko/audit-contracts";
import type { EventBus } from "@relcko/events";
import { HealthStatus } from "@relcko/observability";
import { Action, type AuthorizationContext, type PermissionResolver } from "@relcko/permission";
import type { EntityId, Json } from "@relcko/types";
import { generateId } from "@relcko/utils";
import { OperationsValidationError } from "./errors";
import { OperationsEventType, publishOperationsEvent } from "./events";
import type { MetricsEngine } from "./monitoring";
import type { OperationsRepository } from "./repository";
import type {
  AlertRule, AuditQuery, DashboardSnapshot, Incident, IncidentTimelineEntry, MonitorResult,
  OperationalProbe, OperationsAlert, OperationsAnalyticsSnapshot, OperationsModule,
  SystemHealthSnapshot,
} from "./types";

export class SystemHealthEngine {
  private readonly probes = new Map<OperationsModule, OperationalProbe>();
  constructor(private readonly repository: OperationsRepository, private readonly metrics: MetricsEngine, private readonly events: EventBus) {}
  register(probe: OperationalProbe): void { this.probes.set(probe.module, probe); }
  unregister(module: OperationsModule): void { this.probes.delete(module); }
  async check(): Promise<SystemHealthSnapshot> {
    const results: MonitorResult[] = [];
    for (const probe of this.probes.values()) {
      try { results.push(await probe.check()); }
      catch (error) { results.push({ module: probe.module, status: HealthStatus.Unhealthy, metrics: [], detail: error instanceof Error ? error.message : String(error), checkedAt: new Date().toISOString() }); }
    }
    for (const result of results) for (const metric of result.metrics) this.metrics[metric.kind === "counter" ? "increment" : metric.kind === "timing" ? "record" : "gauge"](metric.name, metric.value, metric.tags);
    const status = results.some(v => v.status === HealthStatus.Unhealthy) ? HealthStatus.Unhealthy : results.some(v => v.status === HealthStatus.Degraded) ? HealthStatus.Degraded : HealthStatus.Healthy;
    const snapshot: SystemHealthSnapshot = {
      id: generateId("ophealth") as EntityId, status,
      modules: results.map(v => ({ module: v.module, status: v.status, detail: v.detail, checkedAt: v.checkedAt })),
      checkedAt: new Date().toISOString(),
    };
    this.repository.saveHealth(snapshot);
    await publishOperationsEvent(this.events, OperationsEventType.HealthChecked, snapshot.id, { status, moduleCount: snapshot.modules.length });
    return snapshot;
  }
}

export class AlertEngine {
  private readonly breaches = new Map<string, number>();
  constructor(private readonly repository: OperationsRepository, private readonly events: EventBus) {}
  addRule(rule: AlertRule): void {
    if (rule.consecutiveBreaches < 1) throw new OperationsValidationError("consecutiveBreaches must be at least 1");
    this.repository.saveAlertRule(rule);
  }
  async evaluate(rule: AlertRule, value: number, module: OperationsModule = rule.module ?? "system"): Promise<OperationsAlert | undefined> {
    if (!rule.enabled) return undefined;
    const breached = compare(value, rule.operator, rule.threshold);
    const count = breached ? (this.breaches.get(rule.id) ?? 0) + 1 : 0;
    this.breaches.set(rule.id, count);
    if (count < rule.consecutiveBreaches) return undefined;
    const existing = this.repository.listAlerts("open").find(v => v.ruleId === rule.id && v.module === module);
    if (existing) return existing;
    const now = new Date().toISOString();
    const alert: OperationsAlert = {
      id: generateId("opalert") as EntityId, ruleId: rule.id, module, severity: rule.severity, status: "open",
      title: rule.name, message: `${rule.metric} ${rule.operator} ${rule.threshold}`, value, threshold: rule.threshold,
      createdAt: now, updatedAt: now,
    };
    this.repository.saveAlert(alert);
    await publishOperationsEvent(this.events, OperationsEventType.AlertOpened, alert.id, { module, severity: alert.severity, title: alert.title });
    return alert;
  }
  async open(module: OperationsModule, severity: OperationsAlert["severity"], title: string, message: string, context: Pick<OperationsAlert, "correlationId" | "traceId"> = {}): Promise<OperationsAlert> {
    const now = new Date().toISOString();
    const alert: OperationsAlert = { id: generateId("opalert") as EntityId, module, severity, status: "open", title, message, ...context, createdAt: now, updatedAt: now };
    this.repository.saveAlert(alert);
    await publishOperationsEvent(this.events, OperationsEventType.AlertOpened, alert.id, { module, severity, title });
    return alert;
  }
  async acknowledge(id: EntityId, actorId: EntityId): Promise<OperationsAlert> { return this.transition(id, "acknowledged", OperationsEventType.AlertAcknowledged, actorId); }
  async resolve(id: EntityId, actorId: EntityId): Promise<OperationsAlert> { return this.transition(id, "resolved", OperationsEventType.AlertResolved, actorId); }
  private async transition(id: EntityId, status: OperationsAlert["status"], event: string, actorId: EntityId): Promise<OperationsAlert> {
    const current = this.repository.getAlert(id);
    if (!current) throw new OperationsValidationError(`Alert ${id} not found`);
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    this.repository.saveAlert(updated);
    await publishOperationsEvent(this.events, event, id, { status }, actorId);
    return updated;
  }
}

export class AuditQueryService {
  constructor(private readonly audit: AuditReader, private readonly permission: PermissionResolver) {}
  async query(auth: AuthorizationContext, query: AuditQuery): Promise<readonly AuditLog[]> {
    this.permission.assertAuthorized(auth, Action.ReadAudit);
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1)) throw new OperationsValidationError("limit must be a positive integer");
    const entries = await this.audit.query({ actorId: query.actorId, from: query.from, to: query.to });
    const filtered = entries.filter(entry => {
      const values = [entry.before, entry.after].filter((v): v is Record<string, unknown> => Boolean(v));
      if (query.correlationId && !values.some(v => v.correlationId === query.correlationId)) return false;
      if (query.traceId && !values.some(v => v.traceId === query.traceId)) return false;
      if (query.module && !values.some(v => v.module === query.module)) return false;
      if (query.severity && !values.some(v => v.severity === query.severity)) return false;
      return true;
    });
    return query.limit ? filtered.slice(0, query.limit) : filtered;
  }
}

export class OperationsAnalytics {
  constructor(private readonly repository: OperationsRepository) {}
  compute(period: string, from?: string, to?: string): OperationsAnalyticsSnapshot {
    const events = this.repository.listEvents(from, to);
    const metrics = this.repository.listMetrics(undefined, from, to);
    const errors = events.filter(v => v.failed).length;
    const retries = events.reduce((sum, v) => sum + v.retryCount, 0);
    return {
      period, eventThroughput: events.length, errorRate: events.length ? errors / events.length : 0,
      retryRate: events.length ? retries / events.length : 0,
      deadLetterCount: metrics.filter(v => v.name === "operations.queue.dead_letters").at(-1)?.value ?? 0,
      averageLatencyMs: events.length ? events.reduce((sum, v) => sum + v.latencyMs, 0) / events.length : 0,
      openAlerts: this.repository.listAlerts("open").length,
      unhealthyModules: this.repository.getLatestHealth()?.modules.filter(v => v.status === HealthStatus.Unhealthy).length ?? 0,
      computedAt: new Date().toISOString(),
    };
  }
}

export class IncidentTimeline {
  constructor(private readonly repository: OperationsRepository, private readonly events: EventBus) {}
  async create(title: string, severity: Incident["severity"], module: OperationsModule, actorId: EntityId, alertIds: readonly EntityId[] = []): Promise<Incident> {
    const incident: Incident = { id: generateId("incident") as EntityId, title, severity, module, status: "open", alertIds, createdAt: new Date().toISOString() };
    this.repository.saveIncident(incident);
    this.addEntry(incident.id, "created", title, actorId);
    await publishOperationsEvent(this.events, OperationsEventType.IncidentCreated, incident.id, { title, severity, module }, actorId);
    return incident;
  }
  addEntry(incidentId: EntityId, type: string, message: string, actorId: EntityId, correlationId?: string, traceId?: string): IncidentTimelineEntry {
    if (!this.repository.getIncident(incidentId)) throw new OperationsValidationError(`Incident ${incidentId} not found`);
    const entry: IncidentTimelineEntry = { id: generateId("incidententry") as EntityId, incidentId, type, message, actorId, correlationId, traceId, occurredAt: new Date().toISOString() };
    this.repository.saveIncidentEntry(entry);
    return entry;
  }
  async resolve(incidentId: EntityId, actorId: EntityId): Promise<Incident> {
    const current = this.repository.getIncident(incidentId);
    if (!current) throw new OperationsValidationError(`Incident ${incidentId} not found`);
    const resolved: Incident = { ...current, status: "resolved", resolvedAt: new Date().toISOString() };
    this.repository.saveIncident(resolved);
    this.addEntry(incidentId, "resolved", "Incident resolved", actorId);
    await publishOperationsEvent(this.events, OperationsEventType.IncidentResolved, incidentId, { status: "resolved" }, actorId);
    return resolved;
  }
  get(incidentId: EntityId): readonly IncidentTimelineEntry[] { return this.repository.listIncidentEntries(incidentId); }
}

export class HealthReportGenerator {
  constructor(private readonly events: EventBus) {}
  async generate(health: SystemHealthSnapshot, analytics: OperationsAnalyticsSnapshot): Promise<{ id: EntityId; generatedAt: string; content: Json }> {
    const id = generateId("opreport") as EntityId;
    const content: Json = { status: health.status, modules: health.modules.map(v => ({ module: v.module, status: v.status })), analytics: { ...analytics } };
    await publishOperationsEvent(this.events, OperationsEventType.ReportGenerated, id, { status: health.status, period: analytics.period });
    return { id, generatedAt: new Date().toISOString(), content };
  }
}

export class OperationsDashboardAdapter {
  constructor(private readonly repository: OperationsRepository, private readonly analytics: OperationsAnalytics, private readonly health: SystemHealthEngine, private readonly permission: PermissionResolver) {}
  async snapshot(auth: AuthorizationContext, period: string): Promise<DashboardSnapshot> {
    this.permission.assertAuthorized(auth, Action.ReadAudit);
    const health = await this.health.check();
    return { health, analytics: this.analytics.compute(period), alerts: this.repository.listAlerts("open"), queues: this.repository.listQueues(), workers: this.repository.listWorkers(), generatedAt: new Date().toISOString() };
  }
}

export class OperationsService {
  constructor(private readonly repository: OperationsRepository, private readonly permission: PermissionResolver) {}
  metrics(auth: AuthorizationContext, name?: string): readonly unknown[] { this.permission.assertAuthorized(auth, Action.ReadAudit); return this.repository.listMetrics(name); }
  alerts(auth: AuthorizationContext): readonly OperationsAlert[] { this.permission.assertAuthorized(auth, Action.ReadAudit); return this.repository.listAlerts(); }
  events(auth: AuthorizationContext): readonly unknown[] { this.permission.assertAuthorized(auth, Action.ReadAudit); return this.repository.listEvents(); }
  logs(auth: AuthorizationContext): readonly unknown[] { this.permission.assertAuthorized(auth, Action.ReadAudit); return this.repository.listLogs(); }
  traces(auth: AuthorizationContext, traceId: string): readonly unknown[] { this.permission.assertAuthorized(auth, Action.ReadAudit); return this.repository.listTrace(traceId); }
}

function compare(value: number, operator: AlertRule["operator"], threshold: number): boolean {
  if (operator === "gt") return value > threshold;
  if (operator === "gte") return value >= threshold;
  if (operator === "lt") return value < threshold;
  if (operator === "lte") return value <= threshold;
  return value === threshold;
}
