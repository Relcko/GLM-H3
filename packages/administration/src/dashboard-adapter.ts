import type { AuthorizationContext } from "@relcko/permission";
import { Action, PermissionResolver } from "@relcko/permission";
import type { InMemoryAdministrationRepository } from "./repository";
import type { AdministrationAnalytics } from "./analytics";
import type { EmergencyAdministration, SystemMaintenanceAdministration } from "./platform-admin";
import type { AdminDashboardSnapshot } from "./types";

/** Produces an authorized, consolidated administration dashboard snapshot. */
export class AdministrationDashboardAdapter {
  constructor(
    private readonly repo: InMemoryAdministrationRepository,
    private readonly analyticsEngine: AdministrationAnalytics,
    private readonly emergency: EmergencyAdministration,
    private readonly maintenance: SystemMaintenanceAdministration,
    private readonly permission: PermissionResolver,
  ) {}

  snapshot(auth: AuthorizationContext, period = "current"): AdminDashboardSnapshot {
    this.permission.assertAuthorized(auth, Action.ManageUsers);
    return {
      emergency: this.emergency.state(),
      maintenance: this.maintenance.state() ?? { enabled: false, reason: "", enabledBy: "" as never, enabledAt: new Date().toISOString() },
      announcements: this.repo.listAnnouncements(true),
      recentJobs: this.repo.listJobs().slice(0, 10),
      recentBackups: this.repo.listBackups().slice(0, 10),
      activity: this.repo.listActivity(25),
      generatedAt: new Date().toISOString(),
    };
  }

  analytics(auth: AuthorizationContext, period = "current") {
    this.permission.assertAuthorized(auth, Action.ManageUsers);
    return this.analyticsEngine.compute(period);
  }
}
