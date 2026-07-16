import type { EntityId } from "@relcko/types";
import type {
  AlertRule, Incident, IncidentTimelineEntry, MetricPoint, ModuleHealthRecord, MonitoredEvent,
  OperationsAlert, OperationsLogRecord, QueueSnapshot, SystemHealthSnapshot, TelemetryRecord,
  TraceSpanRecord, WorkerSnapshot,
} from "./types";

export interface OperationsRepository {
  saveMetric(value: MetricPoint): void;
  listMetrics(name?: string, from?: string, to?: string): MetricPoint[];
  saveTelemetry(value: TelemetryRecord): void;
  listTelemetry(from?: string, to?: string): TelemetryRecord[];
  saveTrace(value: TraceSpanRecord): void;
  getTraceSpan(spanId: string): TraceSpanRecord | undefined;
  listTrace(traceId: string): TraceSpanRecord[];
  saveHealth(value: SystemHealthSnapshot): void;
  getLatestHealth(): SystemHealthSnapshot | undefined;
  saveAlertRule(value: AlertRule): void;
  listAlertRules(): AlertRule[];
  saveAlert(value: OperationsAlert): void;
  getAlert(id: EntityId): OperationsAlert | undefined;
  listAlerts(status?: OperationsAlert["status"]): OperationsAlert[];
  saveEvent(value: MonitoredEvent): void;
  listEvents(from?: string, to?: string): MonitoredEvent[];
  saveQueue(value: QueueSnapshot): void;
  listQueues(): QueueSnapshot[];
  saveWorker(value: WorkerSnapshot): void;
  listWorkers(): WorkerSnapshot[];
  saveLog(value: OperationsLogRecord): void;
  listLogs(from?: string, to?: string): OperationsLogRecord[];
  saveIncident(value: Incident): void;
  getIncident(id: EntityId): Incident | undefined;
  listIncidents(): Incident[];
  saveIncidentEntry(value: IncidentTimelineEntry): void;
  listIncidentEntries(incidentId: EntityId): IncidentTimelineEntry[];
}

export class InMemoryOperationsRepository implements OperationsRepository {
  private readonly metrics: MetricPoint[] = [];
  private readonly telemetry: TelemetryRecord[] = [];
  private readonly traces = new Map<string, TraceSpanRecord>();
  private readonly health: SystemHealthSnapshot[] = [];
  private readonly rules = new Map<string, AlertRule>();
  private readonly alerts = new Map<string, OperationsAlert>();
  private readonly events: MonitoredEvent[] = [];
  private readonly queues = new Map<string, QueueSnapshot>();
  private readonly workers = new Map<string, WorkerSnapshot>();
  private readonly logs: OperationsLogRecord[] = [];
  private readonly incidents = new Map<string, Incident>();
  private readonly incidentEntries: IncidentTimelineEntry[] = [];

  saveMetric(v: MetricPoint): void { this.metrics.push(v); }
  listMetrics(name?: string, from?: string, to?: string): MetricPoint[] { return filterTime(this.metrics.filter(v => !name || v.name === name), v => v.recordedAt, from, to); }
  saveTelemetry(v: TelemetryRecord): void { this.telemetry.push(v); }
  listTelemetry(from?: string, to?: string): TelemetryRecord[] { return filterTime(this.telemetry, v => v.recordedAt, from, to); }
  saveTrace(v: TraceSpanRecord): void { this.traces.set(v.spanId, v); }
  getTraceSpan(id: string): TraceSpanRecord | undefined { return this.traces.get(id); }
  listTrace(id: string): TraceSpanRecord[] { return [...this.traces.values()].filter(v => v.traceId === id).sort((a, b) => a.startedAt.localeCompare(b.startedAt)); }
  saveHealth(v: SystemHealthSnapshot): void { this.health.push(v); }
  getLatestHealth(): SystemHealthSnapshot | undefined { return this.health[this.health.length - 1]; }
  saveAlertRule(v: AlertRule): void { this.rules.set(v.id, v); }
  listAlertRules(): AlertRule[] { return [...this.rules.values()]; }
  saveAlert(v: OperationsAlert): void { this.alerts.set(v.id, v); }
  getAlert(id: EntityId): OperationsAlert | undefined { return this.alerts.get(id); }
  listAlerts(status?: OperationsAlert["status"]): OperationsAlert[] { return [...this.alerts.values()].filter(v => !status || v.status === status); }
  saveEvent(v: MonitoredEvent): void { this.events.push(v); }
  listEvents(from?: string, to?: string): MonitoredEvent[] { return filterTime(this.events, v => v.observedAt, from, to); }
  saveQueue(v: QueueSnapshot): void { this.queues.set(v.queue, v); }
  listQueues(): QueueSnapshot[] { return [...this.queues.values()]; }
  saveWorker(v: WorkerSnapshot): void { this.workers.set(v.worker, v); }
  listWorkers(): WorkerSnapshot[] { return [...this.workers.values()]; }
  saveLog(v: OperationsLogRecord): void { this.logs.push(v); }
  listLogs(from?: string, to?: string): OperationsLogRecord[] { return filterTime(this.logs, v => v.time, from, to); }
  saveIncident(v: Incident): void { this.incidents.set(v.id, v); }
  getIncident(id: EntityId): Incident | undefined { return this.incidents.get(id); }
  listIncidents(): Incident[] { return [...this.incidents.values()]; }
  saveIncidentEntry(v: IncidentTimelineEntry): void { this.incidentEntries.push(v); }
  listIncidentEntries(id: EntityId): IncidentTimelineEntry[] { return this.incidentEntries.filter(v => v.incidentId === id).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)); }
}

function filterTime<T>(values: readonly T[], get: (v: T) => string, from?: string, to?: string): T[] {
  return values.filter(v => (!from || get(v) >= from) && (!to || get(v) <= to));
}
