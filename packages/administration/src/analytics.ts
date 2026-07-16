import type { EntityId } from "@relcko/types";
import { InMemoryAdministrationRepository } from "./repository";
import type { AdminAnalyticsSnapshot, AdminArea } from "./types";

/** Aggregates administrative activity into per-area and platform-control metrics. */
export class AdministrationAnalytics {
  constructor(private readonly repo: InMemoryAdministrationRepository) {}

  compute(period: string): AdminAnalyticsSnapshot {
    const activity = this.repo.listActivity();
    const byArea = new Map<string, number>();
    let emergencyPauses = 0;
    let maintenanceWindows = 0;
    for (const entry of activity) {
      if (entry.action === "admin.emergency.pause") emergencyPauses++;
      if (entry.action === "admin.maintenance.enter") maintenanceWindows++;
      const area = (entry as unknown as { area?: AdminArea }).area ?? inferArea(entry.action);
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    const announcements = this.repo.listAnnouncements().filter(v => v.published).length;
    const jobs = this.repo.listJobs().filter(v => v.status === "completed" || v.status === "failed").length;
    const backups = this.repo.listBackups().filter(v => v.status === "completed" || v.status === "verified").length;
    return {
      period,
      actionsByArea: Object.fromEntries(byArea.entries()),
      totalActions: activity.length,
      emergencyPauses,
      maintenanceWindows,
      announcementsPublished: announcements,
      jobsExecuted: jobs,
      backupsCompleted: backups,
      computedAt: new Date().toISOString(),
    };
  }
}

function inferArea(action: string): string {
  const prefix = action.split(".")[1];
  return prefix ?? "unknown";
}

export function newAnalyticsId(prefix: string): EntityId {
  return `${prefix}_${Date.now()}` as EntityId;
}
