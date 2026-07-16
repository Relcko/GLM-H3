import type { FlagProvider } from "@relcko/feature-flags";
import type { NotificationSender } from "@relcko/notification-contracts";
import type { EntityId, Json, Severity } from "@relcko/types";
import type { AuditStore } from "@relcko/audit-contracts";
import { Severity as Sev } from "@relcko/types";
import type { OperationsModuleContext } from "@relcko/operations";
import { BaseAdministration, type AdminDeps } from "./base";
import type { DomainAdminPort } from "./ports";
import type {
  AdminActor, AdminAction, AdminAnnouncement, AdminBackup, AdminJob, AdminResult,
  AdminSearchEntry, EmergencyState, JobKind, MaintenanceMode,
} from "./types";
import { AdministrationEventType, publishAdministrationEvent } from "./events";
import { AdministrationValidationError, EmergencyStateError } from "./errors";
import { newEntityId } from "./repository";

function ok<T>(action: AdminAction, actor: AdminActor, data: T, entityId?: EntityId): AdminResult<T> {
  return { success: true, data, action, actorId: actor.id, entityId, occurredAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Compliance / KYC / AML / Document
// ---------------------------------------------------------------------------

export class ComplianceAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly port?: DomainAdminPort) { super(deps, "compliance"); }
  async updateRule(actor: AdminActor, ruleId: EntityId, patch: Record<string, Json>, reason: string) {
    if (!this.port) throw new AdministrationValidationError("compliance administration is not wired");
    return this.execute("admin.compliance.rule.update", actor, ruleId, async () => {
      await this.port!.update(ruleId, patch, reason);
      return ok("admin.compliance.rule.update", actor, { ruleId, reason }, ruleId);
    }, { after: { reason, ...patch } });
  }
  async flag(actor: AdminActor, entityId: EntityId, reason: string) {
    if (!this.port) throw new AdministrationValidationError("compliance administration is not wired");
    return this.execute("admin.compliance.flag", actor, entityId, async () => {
      await this.port!.flag(entityId, reason);
      return ok("admin.compliance.flag", actor, { entityId, reason }, entityId);
    }, { after: { reason } });
  }
}

export class KycAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly port?: DomainAdminPort) { super(deps, "kyc"); }
  async review(actor: AdminActor, kycId: EntityId, decision: "approved" | "rejected", reason: string) {
    if (!this.port) throw new AdministrationValidationError("kyc administration is not wired");
    return this.execute("admin.kyc.review", actor, kycId, async () => {
      await this.port!.update(kycId, { status: decision }, reason);
      return ok("admin.kyc.review", actor, { kycId, decision, reason }, kycId);
    }, { resource: { entityType: "kyc" }, after: { decision, reason } });
  }
  async escalate(actor: AdminActor, kycId: EntityId, reason: string) {
    if (!this.port) throw new AdministrationValidationError("kyc administration is not wired");
    return this.execute("admin.kyc.escalate", actor, kycId, async () => {
      await this.port!.update(kycId, { escalated: true }, reason);
      return ok("admin.kyc.escalate", actor, { kycId, reason }, kycId);
    }, { resource: { entityType: "kyc" }, after: { reason } });
  }
}

export class AmlAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly port?: DomainAdminPort) { super(deps, "aml"); }
  async screen(actor: AdminActor, subjectId: EntityId, findings: Record<string, Json>) {
    if (!this.port) throw new AdministrationValidationError("aml administration is not wired");
    return this.execute("admin.aml.screen", actor, subjectId, async () => {
      await this.port!.update(subjectId, { amlStatus: "screened", findings }, "aml screen");
      return ok("admin.aml.screen", actor, { subjectId }, subjectId);
    }, { after: findings });
  }
  async report(actor: AdminActor, subjectId: EntityId, report: Record<string, Json>) {
    if (!this.port) throw new AdministrationValidationError("aml administration is not wired");
    return this.execute("admin.aml.report", actor, subjectId, async () => {
      await this.port!.update(subjectId, { sarFiled: true }, "aml report");
      return ok("admin.aml.report", actor, { subjectId }, subjectId);
    }, { after: report });
  }
}

export class DocumentAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly port?: DomainAdminPort) { super(deps, "document"); }
  async classify(actor: AdminActor, docId: EntityId, category: string, reason: string) {
    if (!this.port) throw new AdministrationValidationError("document administration is not wired");
    return this.execute("admin.document.classify", actor, docId, async () => {
      await this.port!.update(docId, { category }, reason);
      return ok("admin.document.classify", actor, { docId, category, reason }, docId);
    }, { resource: { entityType: "document" }, after: { category, reason } });
  }
  async redact(actor: AdminActor, docId: EntityId, fields: readonly string[], reason: string) {
    if (!this.port) throw new AdministrationValidationError("document administration is not wired");
    return this.execute("admin.document.redact", actor, docId, async () => {
      await this.port!.update(docId, { redactedFields: [...fields] }, reason);
      return ok("admin.document.redact", actor, { docId, fields, reason }, docId);
    }, { resource: { entityType: "document" }, after: { fields: [...fields], reason } });
  }
}

export class AuditAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly auditStore: AuditStore) { super(deps, "audit"); }
  async query(actor: AdminActor, filter: Record<string, Json>) {
    this.assert(actor);
    const entries = await this.auditStore.query({
      actorId: filter.actorId as EntityId | undefined,
      entityId: filter.entityId as EntityId | undefined,
      from: filter.from as string | undefined,
      to: filter.to as string | undefined,
      limit: filter.limit as number | undefined,
    });
    await this.deps.audit.record({ actor, action: "admin.audit.query", area: "audit", entityId: "audit" as EntityId, after: filter });
    return ok("admin.audit.query", actor, entries);
  }
  async export(actor: AdminActor, filter: Record<string, Json>) {
    const result = await this.query(actor, filter);
    await this.deps.audit.record({ actor, action: "admin.audit.export", area: "audit", entityId: "audit" as EntityId, after: filter });
    return ok("admin.audit.export", actor, result.data);
  }
}

// ---------------------------------------------------------------------------
// Operations (reuses the Operations package — no duplicated monitoring)
// ---------------------------------------------------------------------------

export class OperationsAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly operations?: OperationsModuleContext) { super(deps, "operations"); }
  async health(actor: AdminActor) {
    this.assert(actor);
    await this.deps.audit.record({ actor, action: "admin.operations.health", area: "operations", entityId: "operations" as EntityId });
    if (!this.operations) throw new AdministrationValidationError("operations module not wired");
    return ok("admin.operations.health", actor, await this.operations.health.check());
  }
  async acknowledgeAlert(actor: AdminActor, alertId: EntityId) {
    if (!this.operations) throw new AdministrationValidationError("operations module not wired");
    return this.execute("admin.operations.alert.ack", actor, alertId, async () => {
      const updated = await this.operations!.alerts.acknowledge(alertId, actor.id as EntityId);
      return ok("admin.operations.alert.ack", actor, updated, alertId);
    });
  }
  async resolveIncident(actor: AdminActor, incidentId: EntityId) {
    if (!this.operations) throw new AdministrationValidationError("operations module not wired");
    return this.execute("admin.operations.incident.resolve", actor, incidentId, async () => {
      const resolved = await this.operations!.incidents.resolve(incidentId, actor.id as EntityId);
      return ok("admin.operations.incident.resolve", actor, resolved, incidentId);
    });
  }
}

// ---------------------------------------------------------------------------
// Notification / Configuration / Feature Flag
// ---------------------------------------------------------------------------

export class NotificationAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly sender?: NotificationSender) { super(deps, "notification"); }
  async send(actor: AdminActor, recipientId: EntityId, title: string, body: string, severity: Severity = Sev.Info) {
    return this.execute("admin.notification.send", actor, recipientId, async () => {
      const result = this.sender
        ? await this.sender.send({ id: newEntityId("ntf"), channel: "in_app" as never, recipientId, title, body, severity, createdAt: new Date().toISOString() })
        : { delivered: false, channel: "in_app" as never, messageId: "noop" };
      return ok("admin.notification.send", actor, result, recipientId);
    }, { after: { title, severity } });
  }
  async updateTemplate(actor: AdminActor, templateId: EntityId, patch: Record<string, Json>, reason: string) {
    return this.execute("admin.notification.template.update", actor, templateId, async () => {
      return ok("admin.notification.template.update", actor, { templateId, reason }, templateId);
    }, { after: { reason, ...patch } });
  }
}

export class ConfigurationAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "configuration"); }
  async update(actor: AdminActor, key: string, value: string, reason: string) {
    return this.execute("admin.configuration.update", actor, key as EntityId, async () => {
      this.deps.repo.setConfigOverride(key, value);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.ConfigurationChanged, actor.id as EntityId, { key, value, reason } as Json, { aggregateId: key as EntityId });
      return ok("admin.configuration.update", actor, { key, value, reason }, key as EntityId);
    }, { after: { key, value, reason } });
  }
  async reset(actor: AdminActor, key: string) {
    return this.execute("admin.configuration.reset", actor, key as EntityId, async () => {
      this.deps.repo.setConfigOverride(key, "");
      return ok("admin.configuration.reset", actor, { key }, key as EntityId);
    });
  }
  overrides(): Readonly<Record<string, string>> { return this.deps.repo.getConfigOverrides(); }
}

export class FeatureFlagAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, private readonly flags: FlagProvider) { super(deps, "feature_flag"); }
  async set(actor: AdminActor, key: string, enabled: boolean, reason: string) {
    return this.execute("admin.feature_flag.set", actor, key as EntityId, async () => {
      this.flags.set(key, enabled);
      this.deps.repo.setFlagOverride(key, enabled);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.FeatureFlagChanged, actor.id as EntityId, { key, enabled, reason } as Json, { aggregateId: key as EntityId });
      return ok("admin.feature_flag.set", actor, { key, enabled, reason }, key as EntityId);
    }, { after: { key, enabled, reason } });
  }
  async unset(actor: AdminActor, key: string) {
    return this.execute("admin.feature_flag.unset", actor, key as EntityId, async () => {
      this.deps.repo.unsetFlagOverride(key);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.FeatureFlagChanged, actor.id as EntityId, { key, enabled: null } as Json, { aggregateId: key as EntityId });
      return ok("admin.feature_flag.unset", actor, { key }, key as EntityId);
    });
  }
}

// ---------------------------------------------------------------------------
// Emergency / Maintenance / Backup / Job / Announcement / Search
// ---------------------------------------------------------------------------

export class EmergencyAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "emergency"); }
  async pause(actor: AdminActor, reason: string) {
    const current = this.deps.repo.getEmergency();
    if (current.paused) throw new EmergencyStateError("Platform is already paused");
    return this.execute("admin.emergency.pause", actor, "emergency" as EntityId, async () => {
      const state: EmergencyState = { paused: true, reason, pausedBy: actor.id as EntityId, pausedAt: new Date().toISOString() };
      this.deps.repo.setEmergency(state);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.EmergencyPaused, actor.id as EntityId, { reason } as Json);
      return ok("admin.emergency.pause", actor, state);
    }, { after: { reason } });
  }
  async resume(actor: AdminActor, reason: string) {
    const current = this.deps.repo.getEmergency();
    if (!current.paused) throw new EmergencyStateError("Platform is not paused");
    return this.execute("admin.emergency.resume", actor, "emergency" as EntityId, async () => {
      const state: EmergencyState = { ...current, paused: false, resumedAt: new Date().toISOString() };
      this.deps.repo.setEmergency(state);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.EmergencyResumed, actor.id as EntityId, { reason } as Json);
      return ok("admin.emergency.resume", actor, state);
    }, { after: { reason } });
  }
  state(): EmergencyState { return this.deps.repo.getEmergency(); }
}

export class SystemMaintenanceAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "maintenance"); }
  async enter(actor: AdminActor, reason: string, expiresAt?: string) {
    return this.execute("admin.maintenance.enter", actor, "maintenance" as EntityId, async () => {
      const state: MaintenanceMode = { enabled: true, reason, enabledBy: actor.id as EntityId, enabledAt: new Date().toISOString(), expiresAt };
      this.deps.repo.setMaintenance(state);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.MaintenanceEntered, actor.id as EntityId, { reason, expiresAt } as Json);
      return ok("admin.maintenance.enter", actor, state);
    }, { after: { reason } });
  }
  async exit(actor: AdminActor, reason: string) {
    return this.execute("admin.maintenance.exit", actor, "maintenance" as EntityId, async () => {
      this.deps.repo.setMaintenance(undefined);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.MaintenanceExited, actor.id as EntityId, { reason } as Json);
      return ok("admin.maintenance.exit", actor, { enabled: false });
    }, { after: { reason } });
  }
  state(): MaintenanceMode | undefined { return this.deps.repo.getMaintenance(); }
}

export class BackupAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "backup"); }
  async trigger(actor: AdminActor, label: string, target: string) {
    return this.execute("admin.backup.trigger", actor, "backup" as EntityId, async () => {
      const entry: AdminBackup = {
        id: newEntityId("bkp"), label, target, status: "in_progress",
        triggeredBy: actor.id as EntityId, triggeredAt: new Date().toISOString(),
      };
      this.deps.repo.saveBackup(entry);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.BackupTriggered, actor.id as EntityId, { label, target } as Json, { aggregateId: entry.id });
      return ok("admin.backup.trigger", actor, entry, entry.id);
    }, { after: { label, target } });
  }
  async complete(actor: AdminActor, backupId: EntityId, sizeBytes: number, checksum: string) {
    return this.execute("admin.backup.verify", actor, backupId, async () => {
      const existing = this.deps.repo.getBackup(backupId);
      if (!existing) throw new AdministrationValidationError(`backup ${backupId} not found`);
      const updated: AdminBackup = { ...existing, status: "completed", completedAt: new Date().toISOString(), sizeBytes, checksum };
      this.deps.repo.saveBackup(updated);
      return ok("admin.backup.verify", actor, updated, backupId);
    }, { after: { sizeBytes, checksum } });
  }
  async restore(actor: AdminActor, backupId: EntityId) {
    return this.execute("admin.backup.restore", actor, backupId, async () => {
      const existing = this.deps.repo.getBackup(backupId);
      if (!existing) throw new AdministrationValidationError(`backup ${backupId} not found`);
      const updated: AdminBackup = { ...existing, restoredAt: new Date().toISOString() };
      this.deps.repo.saveBackup(updated);
      return ok("admin.backup.restore", actor, updated, backupId);
    });
  }
  list(): readonly AdminBackup[] { return this.deps.repo.listBackups(); }
}

export class JobAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "job"); }
  async schedule(actor: AdminActor, kind: JobKind, name: string, payload: Record<string, Json>) {
    return this.execute("admin.job.schedule", actor, "job" as EntityId, async () => {
      const entry: AdminJob = {
        id: newEntityId("job"), kind, name, status: "scheduled",
        payload, scheduledBy: actor.id as EntityId, scheduledAt: new Date().toISOString(),
      };
      this.deps.repo.saveJob(entry);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.JobScheduled, actor.id as EntityId, { kind, name } as Json, { aggregateId: entry.id });
      return ok("admin.job.schedule", actor, entry, entry.id);
    }, { after: { kind, name } });
  }
  async cancel(actor: AdminActor, jobId: EntityId) {
    return this.execute("admin.job.cancel", actor, jobId, async () => {
      const existing = this.deps.repo.getJob(jobId);
      if (!existing) throw new AdministrationValidationError(`job ${jobId} not found`);
      const updated: AdminJob = { ...existing, status: "cancelled" };
      this.deps.repo.saveJob(updated);
      return ok("admin.job.cancel", actor, updated, jobId);
    });
  }
  async complete(actor: AdminActor, jobId: EntityId, result: Record<string, Json>) {
    return this.execute("admin.job.retry", actor, jobId, async () => {
      const existing = this.deps.repo.getJob(jobId);
      if (!existing) throw new AdministrationValidationError(`job ${jobId} not found`);
      const updated: AdminJob = { ...existing, status: "completed", finishedAt: new Date().toISOString(), result };
      this.deps.repo.saveJob(updated);
      return ok("admin.job.retry", actor, updated, jobId);
    }, { after: result });
  }
  list(): readonly AdminJob[] { return this.deps.repo.listJobs(); }
}

export class AnnouncementAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "announcement"); }
  async publish(actor: AdminActor, title: string, body: string, audience: AdminAnnouncement["audience"], severity: Severity) {
    return this.execute("admin.announcement.publish", actor, "announcement" as EntityId, async () => {
      const now = new Date().toISOString();
      const entry: AdminAnnouncement = {
        id: newEntityId("ann"), title, body, audience, severity, published: true,
        publishedBy: actor.id as EntityId, publishedAt: now, createdAt: now,
      };
      this.deps.repo.saveAnnouncement(entry);
      await publishAdministrationEvent(this.deps.events, AdministrationEventType.AnnouncementPublished, actor.id as EntityId, { title, audience, severity } as Json, { aggregateId: entry.id });
      return ok("admin.announcement.publish", actor, entry, entry.id);
    }, { after: { title, audience, severity } });
  }
  async retract(actor: AdminActor, announcementId: EntityId) {
    return this.execute("admin.announcement.retract", actor, announcementId, async () => {
      const existing = this.deps.repo.getAnnouncement(announcementId);
      if (!existing) throw new AdministrationValidationError(`announcement ${announcementId} not found`);
      const updated: AdminAnnouncement = { ...existing, published: false, retractedAt: new Date().toISOString() };
      this.deps.repo.saveAnnouncement(updated);
      return ok("admin.announcement.retract", actor, updated, announcementId);
    });
  }
  list(publishedOnly = false): readonly AdminAnnouncement[] { return this.deps.repo.listAnnouncements(publishedOnly); }
}

export class SearchAdministration extends BaseAdministration {
  constructor(deps: AdminDeps) { super(deps, "search"); }
  async index(actor: AdminActor, entry: Omit<AdminSearchEntry, "id" | "indexedAt">) {
    return this.execute("admin.search.reindex", actor, entry.entityId, async () => {
      const record: AdminSearchEntry = { ...entry, id: newEntityId("idx"), indexedAt: new Date().toISOString() };
      this.deps.repo.index(record);
      return ok("admin.search.reindex", actor, record, record.id);
    }, { after: { area: entry.area } });
  }
  async addSynonym(actor: AdminActor, entityId: EntityId, synonym: string) {
    return this.execute("admin.search.synonym", actor, entityId, async () => {
      return ok("admin.search.synonym", actor, { entityId, synonym }, entityId);
    }, { after: { synonym } });
  }
  query(keyword: string, area?: string): readonly AdminSearchEntry[] { return this.deps.repo.search(keyword, area); }
}
