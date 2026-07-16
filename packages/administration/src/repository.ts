import type { EntityId, Timestamp } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type {
  AdminActivityEntry, AdminAnnouncement, AdminBackup, AdminJob, AdminSearchEntry,
  EmergencyState, MaintenanceMode,
} from "./types";

/**
 * In-memory administration repository. Stores platform-control state that is
 * NOT domain business state: announcements, jobs, backups, maintenance/emergency
 * flags, search index, and the administrator activity log. Domain state remains
 * owned by the respective domain packages; this repository only holds operational
 * control records for the administration platform.
 */
export class InMemoryAdministrationRepository {
  private readonly announcements = new Map<string, AdminAnnouncement>();
  private readonly jobs = new Map<string, AdminJob>();
  private readonly backups = new Map<string, AdminBackup>();
  private readonly searchIndex = new Map<string, AdminSearchEntry>();
  private readonly activity = new Map<string, AdminActivityEntry>();
  private maintenance: MaintenanceMode | undefined;
  private emergency: EmergencyState = { paused: false };
  private featureFlagOverrides = new Map<string, boolean>();
  private configOverrides = new Map<string, string>();

  // ---- Announcements ----
  saveAnnouncement(entry: AdminAnnouncement): void { this.announcements.set(entry.id, entry); }
  getAnnouncement(id: string): AdminAnnouncement | undefined { return this.announcements.get(id); }
  listAnnouncements(publishedOnly = false): readonly AdminAnnouncement[] {
    return [...this.announcements.values()]
      .filter(v => !publishedOnly || v.published)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // ---- Jobs ----
  saveJob(entry: AdminJob): void { this.jobs.set(entry.id, entry); }
  getJob(id: string): AdminJob | undefined { return this.jobs.get(id); }
  listJobs(): readonly AdminJob[] {
    return [...this.jobs.values()].sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1));
  }

  // ---- Backups ----
  saveBackup(entry: AdminBackup): void { this.backups.set(entry.id, entry); }
  getBackup(id: string): AdminBackup | undefined { return this.backups.get(id); }
  listBackups(): readonly AdminBackup[] {
    return [...this.backups.values()].sort((a, b) => (a.triggeredAt < b.triggeredAt ? 1 : -1));
  }

  // ---- Search index ----
  index(entry: AdminSearchEntry): void { this.searchIndex.set(entry.id, entry); }
  removeFromIndex(id: string): void { this.searchIndex.delete(id); }
  search(keyword: string, area?: string): readonly AdminSearchEntry[] {
    const k = keyword.toLowerCase();
    return [...this.searchIndex.values()].filter(v =>
      (!area || v.area === area) &&
      (v.title.toLowerCase().includes(k) || v.keywords.some(kw => kw.toLowerCase().includes(k))),
    );
  }

  // ---- Activity ----
  saveActivity(entry: AdminActivityEntry): void { this.activity.set(entry.id, entry); }
  listActivity(limit?: number): readonly AdminActivityEntry[] {
    const all = [...this.activity.values()].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return limit ? all.slice(0, limit) : all;
  }

  // ---- Maintenance / Emergency ----
  getMaintenance(): MaintenanceMode | undefined { return this.maintenance; }
  setMaintenance(state: MaintenanceMode | undefined): void { this.maintenance = state; }
  getEmergency(): EmergencyState { return this.emergency; }
  setEmergency(state: EmergencyState): void { this.emergency = state; }

  // ---- Feature flags / config overrides ----
  setFlagOverride(key: string, value: boolean): void { this.featureFlagOverrides.set(key, value); }
  unsetFlagOverride(key: string): void { this.featureFlagOverrides.delete(key); }
  getFlagOverride(key: string): boolean | undefined { return this.featureFlagOverrides.get(key); }
  setConfigOverride(key: string, value: string): void { this.configOverrides.set(key, value); }
  getConfigOverrides(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.configOverrides.entries());
  }
}

export function newEntityId(prefix: string): EntityId {
  return generateId(prefix) as EntityId;
}

export type { Timestamp };
