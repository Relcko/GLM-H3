import type { EntityId, Json, Timestamp } from "@relcko/types";
import type { AuditAction, EntityType } from "@relcko/domain-core";
import type { OperationsModule } from "@relcko/operations";

/** Administrative capability areas surfaced by the platform. */
export type AdminArea =
  | "user" | "role" | "permission" | "agent"
  | "marketplace" | "property" | "investment" | "nft"
  | "portfolio" | "treasury" | "governance" | "ai"
  | "compliance" | "kyc" | "aml" | "document"
  | "audit" | "operations" | "notification"
  | "configuration" | "feature_flag" | "emergency"
  | "maintenance" | "backup" | "job" | "announcement" | "search";

/**
 * Canonical administrative action verbs. These become AuditLog.action values
 * and administration event types. They are NOT the permission `Action` enum —
 * that is resolved separately through the authorization mapping.
 */
export type AdminAction =
  | "admin.user.create" | "admin.user.update" | "admin.user.suspend" | "admin.user.reinstate" | "admin.user.list"
  | "admin.role.assign" | "admin.role.revoke"
  | "admin.permission.grant" | "admin.permission.revoke"
  | "admin.agent.approve" | "admin.agent.reject" | "admin.agent.suspend"
  | "admin.marketplace.listing.update" | "admin.marketplace.listing.remove" | "admin.marketplace.flag"
  | "admin.property.publish" | "admin.property.unpublish" | "admin.property.update"
  | "admin.investment.refund" | "admin.investment.flag"
  | "admin.nft.mint.review" | "admin.nft.transfer.flag"
  | "admin.portfolio.rebalance" | "admin.portfolio.flag"
  | "admin.treasury.transfer.review" | "admin.treasury.pause"
  | "admin.governance.proposal.flag" | "admin.governance.execution.hold"
  | "admin.ai.model.disable" | "admin.ai.prompt.review"
  | "admin.compliance.rule.update" | "admin.compliance.flag"
  | "admin.kyc.review" | "admin.kyc.escalate"
  | "admin.aml.screen" | "admin.aml.report"
  | "admin.document.classify" | "admin.document.redact"
  | "admin.audit.query" | "admin.audit.export"
  | "admin.operations.health" | "admin.operations.alert.ack" | "admin.operations.incident.resolve"
  | "admin.notification.send" | "admin.notification.template.update"
  | "admin.configuration.update" | "admin.configuration.reset"
  | "admin.feature_flag.set" | "admin.feature_flag.unset"
  | "admin.emergency.pause" | "admin.emergency.resume"
  | "admin.maintenance.enter" | "admin.maintenance.exit"
  | "admin.backup.trigger" | "admin.backup.restore" | "admin.backup.verify"
  | "admin.job.schedule" | "admin.job.cancel" | "admin.job.retry"
  | "admin.announcement.publish" | "admin.announcement.retract"
  | "admin.search.reindex" | "admin.search.synonym";

/** Subject performing an administrative action (derived from the permission engine). */
export interface AdminActor {
  readonly id: string;
  readonly role: import("@relcko/types").Role;
  readonly kycApproved?: boolean;
  readonly mfaLevel?: import("@relcko/permission").MfaLevel;
  readonly riskScore?: number;
}

/** Authorization resource context helper for administrative actions. */
export interface AdminResourceContext {
  readonly ownerId?: string;
  readonly entityType?: EntityType;
  readonly jurisdiction?: string;
}

/** Result envelope for any administrative operation. */
export interface AdminResult<T> {
  readonly success: boolean;
  readonly data: T;
  readonly action: AdminAction;
  readonly actorId: string;
  readonly entityType?: EntityType;
  readonly entityId?: EntityId;
  readonly correlationId?: string;
  readonly occurredAt: Timestamp;
}

export interface AdminAnnouncement {
  readonly id: EntityId;
  readonly title: string;
  readonly body: string;
  readonly audience: "all" | "investors" | "agents" | "admins";
  readonly severity: import("@relcko/types").Severity;
  readonly published: boolean;
  readonly publishedBy: EntityId;
  readonly publishedAt?: Timestamp;
  readonly retractedAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export type JobStatus = "scheduled" | "running" | "completed" | "failed" | "cancelled";
export type JobKind = "report" | "export" | "sync" | "reindex" | "reconcile" | "notify";

export interface AdminJob {
  readonly id: EntityId;
  readonly kind: JobKind;
  readonly name: string;
  readonly status: JobStatus;
  readonly payload: Readonly<Record<string, Json>>;
  readonly scheduledBy: EntityId;
  readonly scheduledAt: Timestamp;
  readonly startedAt?: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly result?: Readonly<Record<string, Json>>;
  readonly error?: string;
}

export type BackupStatus = "pending" | "in_progress" | "completed" | "failed" | "verified";

export interface AdminBackup {
  readonly id: EntityId;
  readonly label: string;
  readonly target: string;
  readonly status: BackupStatus;
  readonly triggeredBy: EntityId;
  readonly triggeredAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly sizeBytes?: number;
  readonly checksum?: string;
  readonly restoredAt?: Timestamp;
}

export interface MaintenanceMode {
  readonly enabled: boolean;
  readonly reason: string;
  readonly enabledBy: EntityId;
  readonly enabledAt: Timestamp;
  readonly expiresAt?: Timestamp;
}

export interface EmergencyState {
  readonly paused: boolean;
  readonly reason?: string;
  readonly pausedBy?: EntityId;
  readonly pausedAt?: Timestamp;
  readonly resumedAt?: Timestamp;
}

export interface AdminSearchEntry {
  readonly id: EntityId;
  readonly area: AdminArea;
  readonly entityType: EntityType;
  readonly entityId: EntityId;
  readonly title: string;
  readonly keywords: readonly string[];
  readonly indexedAt: Timestamp;
}

export interface AdminActivityEntry {
  readonly id: EntityId;
  readonly action: AdminAction;
  readonly actorId: EntityId;
  readonly entityType?: EntityType;
  readonly entityId?: EntityId;
  readonly message: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly occurredAt: Timestamp;
}

export interface AdminAnalyticsSnapshot {
  readonly period: string;
  readonly actionsByArea: Readonly<Record<string, number>>;
  readonly totalActions: number;
  readonly emergencyPauses: number;
  readonly maintenanceWindows: number;
  readonly announcementsPublished: number;
  readonly jobsExecuted: number;
  readonly backupsCompleted: number;
  readonly computedAt: Timestamp;
}

export interface AdminDashboardSnapshot {
  readonly emergency: EmergencyState;
  readonly maintenance: MaintenanceMode;
  readonly announcements: readonly AdminAnnouncement[];
  readonly recentJobs: readonly AdminJob[];
  readonly recentBackups: readonly AdminBackup[];
  readonly activity: readonly AdminActivityEntry[];
  readonly generatedAt: Timestamp;
}

export type { AuditAction, EntityType, OperationsModule };
