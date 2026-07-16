import type { EntityId, Json, Timestamp } from "@relcko/types";
import type { HealthStatus, LogEntry } from "@relcko/observability";

export type OperationsModule =
  | "system" | "events" | "queue" | "worker" | "api" | "database" | "blockchain"
  | "ai" | "marketplace" | "treasury" | "governance" | "identity" | "portfolio"
  | "network" | "investment" | "nft";
export type MetricKind = "counter" | "gauge" | "timing";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type IncidentStatus = "open" | "investigating" | "resolved";
export type TraceStatus = "running" | "completed" | "failed";

export interface MetricPoint {
  readonly id: EntityId;
  readonly name: string;
  readonly kind: MetricKind;
  readonly value: number;
  readonly module: OperationsModule;
  readonly tags: Readonly<Record<string, string | number | boolean>>;
  readonly recordedAt: Timestamp;
}

export interface TelemetryRecord {
  readonly id: EntityId;
  readonly module: OperationsModule;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly metadata: Readonly<Record<string, Json>>;
  readonly recordedAt: Timestamp;
}

export interface TraceSpanRecord {
  readonly id: EntityId;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly module: OperationsModule;
  readonly status: TraceStatus;
  readonly startedAt: Timestamp;
  readonly endedAt?: Timestamp;
  readonly durationMs?: number;
  readonly metadata: Readonly<Record<string, Json>>;
}

export interface ModuleHealthRecord {
  readonly module: OperationsModule;
  readonly status: HealthStatus;
  readonly detail?: string;
  readonly latencyMs?: number;
  readonly checkedAt: Timestamp;
}

export interface SystemHealthSnapshot {
  readonly id: EntityId;
  readonly status: HealthStatus;
  readonly modules: readonly ModuleHealthRecord[];
  readonly checkedAt: Timestamp;
}

export interface AlertRule {
  readonly id: EntityId;
  readonly name: string;
  readonly metric: string;
  readonly module?: OperationsModule;
  readonly operator: "gt" | "gte" | "lt" | "lte" | "eq";
  readonly threshold: number;
  readonly severity: AlertSeverity;
  readonly consecutiveBreaches: number;
  readonly enabled: boolean;
}

export interface OperationsAlert {
  readonly id: EntityId;
  readonly ruleId?: EntityId;
  readonly module: OperationsModule;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly title: string;
  readonly message: string;
  readonly value?: number;
  readonly threshold?: number;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface MonitoredEvent {
  readonly eventId: string;
  readonly type: string;
  readonly module: OperationsModule;
  readonly source?: string;
  readonly aggregateId: EntityId;
  readonly actorId: EntityId;
  readonly correlationId: string;
  readonly traceId: string;
  readonly latencyMs: number;
  readonly retryCount: number;
  readonly failed: boolean;
  readonly observedAt: Timestamp;
}

export interface QueueSnapshot {
  readonly queue: string;
  readonly depth: number;
  readonly retrying: number;
  readonly deadLetters: number;
  readonly oldestAgeMs: number;
  readonly checkedAt: Timestamp;
}

export interface WorkerSnapshot {
  readonly worker: string;
  readonly running: boolean;
  readonly activeJobs: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly heartbeatAt: Timestamp;
}

export interface OperationsLogRecord extends LogEntry {
  readonly id: EntityId;
  readonly module: OperationsModule;
}

export interface IncidentTimelineEntry {
  readonly id: EntityId;
  readonly incidentId: EntityId;
  readonly type: string;
  readonly message: string;
  readonly actorId: EntityId;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly occurredAt: Timestamp;
}

export interface Incident {
  readonly id: EntityId;
  readonly title: string;
  readonly severity: AlertSeverity;
  readonly status: IncidentStatus;
  readonly module: OperationsModule;
  readonly alertIds: readonly EntityId[];
  readonly createdAt: Timestamp;
  readonly resolvedAt?: Timestamp;
}

export interface MonitorResult {
  readonly module: OperationsModule;
  readonly status: HealthStatus;
  readonly metrics: readonly Omit<MetricPoint, "id" | "recordedAt">[];
  readonly detail?: string;
  readonly checkedAt: Timestamp;
}

export interface OperationalProbe {
  readonly module: OperationsModule;
  check(): Promise<MonitorResult> | MonitorResult;
}

export interface ResourceProbe {
  read(): Promise<Readonly<Record<string, number>>> | Readonly<Record<string, number>>;
}

export interface OperationsAnalyticsSnapshot {
  readonly period: string;
  readonly eventThroughput: number;
  readonly errorRate: number;
  readonly retryRate: number;
  readonly deadLetterCount: number;
  readonly averageLatencyMs: number;
  readonly openAlerts: number;
  readonly unhealthyModules: number;
  readonly computedAt: Timestamp;
}

export interface DashboardSnapshot {
  readonly health: SystemHealthSnapshot;
  readonly analytics: OperationsAnalyticsSnapshot;
  readonly alerts: readonly OperationsAlert[];
  readonly queues: readonly QueueSnapshot[];
  readonly workers: readonly WorkerSnapshot[];
  readonly generatedAt: Timestamp;
}

export interface AuditQuery {
  readonly from?: Timestamp;
  readonly to?: Timestamp;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly actorId?: EntityId;
  readonly module?: string;
  readonly severity?: string;
  readonly limit?: number;
}
