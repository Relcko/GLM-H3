import { describe, expect, it } from "vitest";
import { Role } from "@relcko/types";
import { Action, MfaLevel } from "@relcko/permission";
import type { AuditLog, AuditStore } from "@relcko/audit-contracts";
import type { EntityId } from "@relcko/types";
import { createAdministrationModule, type AdministrationModuleContext } from "../index";
import { InMemoryDomainAdminPort, type AdminEntitySummary } from "../ports";
import type { AdminActor } from "../types";

const admin: AdminActor = {
  id: "admin_1",
  role: Role.SuperAdministrator,
  kycApproved: true,
  mfaLevel: MfaLevel.Hardware,
  riskScore: 5,
};

const regularUser: AdminActor = { id: "user_1", role: Role.Investor, kycApproved: true };

function makeAuditStore(): AuditStore & { entries: AuditLog[] } {
  const entries: AuditLog[] = [];
  return {
    entries,
    async write(e) { entries.push(e); },
    async writeMany(e) { entries.push(...e); },
    async getById() { return undefined; },
    async query() { return entries; },
  };
}

const seededUsers: readonly AdminEntitySummary[] = [
  { id: "u_1" as EntityId, label: "Alice", status: "active" },
  { id: "u_2" as EntityId, label: "Bob", status: "suspended" },
];

function build(): AdministrationModuleContext {
  const auditStore = makeAuditStore();
  return createAdministrationModule({
    auditStore,
    domains: {
      user: new InMemoryDomainAdminPort("user", seededUsers),
      treasury: new InMemoryDomainAdminPort("treasury", [{ id: "t_1" as EntityId, label: "Treasury", status: "active" }]),
    },
  });
}

describe("Administration — permissions & authorization", () => {
  it("allows a super administrator to suspend a user", async () => {
    const mod = build();
    const result = await mod.service.user.suspend(admin, "u_1" as EntityId, "policy violation");
    expect(result.success).toBe(true);
    expect((await mod.service.user.get(admin, "u_1" as EntityId))?.status).toBe("disabled");
  });

  it("blocks a non-admin actor from administering users", async () => {
    const mod = build();
    await expect(mod.service.user.suspend(regularUser, "u_1" as EntityId, "x")).rejects.toThrow();
  });

  it("requires SuperAdministrator for emergency pause", async () => {
    const mod = build();
    const adminOnly: AdminActor = { id: "a2", role: Role.Administrator, kycApproved: true, mfaLevel: MfaLevel.Hardware };
    await expect(mod.service.emergency.pause(adminOnly, "drill")).rejects.toThrow();
    const ok = await mod.service.emergency.pause(admin, "drill");
    expect(ok.data.paused).toBe(true);
  });
});

describe("Administration — audit trail", () => {
  it("writes an immutable audit entry for each administrative action", async () => {
    const auditStore = makeAuditStore();
    const mod = createAdministrationModule({
      auditStore,
      domains: {
        user: new InMemoryDomainAdminPort("user", seededUsers),
        role: new InMemoryDomainAdminPort("role", [{ id: "u_1" as EntityId, label: "Alice", status: "active" }]),
      },
    });
    await mod.service.role.assign(admin, "u_1" as EntityId, { role: "agent" } as never, "promotion");
    expect(auditStore.entries.length).toBeGreaterThan(0);
    const entry = auditStore.entries.at(-1)!;
    expect(entry.action).toBe("admin.role.assign");
    expect(entry.actorId).toBe("admin_1");
  });
});

describe("Administration — events", () => {
  it("emits canonical administration events on the shared bus", async () => {
    const mod = build();
    const seen: string[] = [];
    mod.events.subscribeAll((e) => { seen.push(e.type); });
    await mod.service.announcement.publish(admin, "Maintenance", "Brief downtime", "all", "info" as never);
    expect(seen.some((t) => t === "relcko.administration.announcement_published")).toBe(true);
  });
});

describe("Administration — emergency & maintenance", () => {
  it("pauses and resumes the platform exactly once", async () => {
    const mod = build();
    await mod.service.emergency.pause(admin, "incident");
    await expect(mod.service.emergency.pause(admin, "again")).rejects.toThrow(/EMERGENCY_STATE|already paused/);
    const resumed = await mod.service.emergency.resume(admin, "resolved");
    expect(resumed.data.paused).toBe(false);
  });

  it("enters and exits maintenance mode", async () => {
    const mod = build();
    await mod.service.maintenance.enter(admin, "patch window", new Date(Date.now() + 3600_000).toISOString());
    expect(mod.service.maintenance.state()?.enabled).toBe(true);
    await mod.service.maintenance.exit(admin, "done");
    expect(mod.service.maintenance.state()).toBeUndefined();
  });
});

describe("Administration — domain orchestration", () => {
  it("reviews a treasury transfer through the wired port", async () => {
    const mod = build();
    const r = await mod.service.treasury.reviewTransfer(admin, "t_1" as EntityId, true, "cleared");
    expect(r.success).toBe(true);
  });

  it("schedules and completes a job", async () => {
    const mod = build();
    const scheduled = await mod.service.job.schedule(admin, "reindex" as never, "nightly index", {});
    const completed = await mod.service.job.complete(admin, scheduled.data.id, { ok: true });
    expect(completed.data.status).toBe("completed");
  });

  it("triggers and completes a backup", async () => {
    const mod = build();
    const b = await mod.service.backup.trigger(admin, "nightly", "postgres");
    const done = await mod.service.backup.complete(admin, b.data.id, 1024, "sha256:abc");
    expect(done.data.status).toBe("completed");
  });
});

describe("Administration — analytics & timeline", () => {
  it("computes analytics and timelines from activity", async () => {
    const mod = build();
    await mod.service.user.suspend(admin, "u_1" as EntityId, "x");
    await mod.service.announcement.publish(admin, "Hi", "Welcome", "all", "info" as never);
    const snapshot = mod.analytics.compute("2026-07");
    expect(snapshot.totalActions).toBeGreaterThanOrEqual(2);
    expect(mod.timeline.list(5).length).toBeGreaterThan(0);
  });

  it("exposes an authorized dashboard snapshot", async () => {
    const mod = build();
    await mod.service.announcement.publish(admin, "Notice", "Read this", "admins", "info" as never);
    const snap = mod.dashboard.snapshot(
      { subject: { id: admin.id, role: admin.role, kycApproved: true }, resource: {}, env: {} },
      "2026-07",
    );
    expect(snap.announcements.length).toBeGreaterThan(0);
    expect(snap.emergency.paused).toBe(false);
  });
});

describe("Administration — event adapter integration", () => {
  it("observes cross-domain events into the activity timeline", async () => {
    const mod = build();
    await mod.events.publish({
      eventId: "evt_1" as never, type: "relcko.treasury.transfer_approved",
      aggregateId: "t_1" as EntityId, occurredAt: new Date().toISOString(),
      actorId: "actor_x" as EntityId, version: 1 as never,
      correlationId: "corr_1" as never, traceId: "trace_1" as never,
      idempotencyKey: "idk_1" as never, payload: {}, source: "relcko.treasury",
    } as never);
    const observed = mod.timeline.list().some((e) => e.message.includes("relcko.treasury"));
    expect(observed).toBe(true);
  });
});
