import { describe, it, expect, beforeEach } from "vitest";
import { Role, Permission, hasPermission, AuthorizationService } from "../authorization.service";
import type { Actor, AuthorizationServiceDeps } from "../authorization.service";
import type { IClock } from "../../infrastructure/services/clock";

function makeClock(fixedNow: number = 1_000_000_000_000): IClock {
  return { now: () => new Date(fixedNow), nowMs: () => fixedNow };
}

function makeActor(id: string, roles: Role[]): Actor {
  return { id, roles };
}

describe("hasPermission", () => {
  it("allows Admin to do everything", () => {
    const admin = makeActor("admin-1", [Role.Admin]);
    for (const p of Object.values(Permission)) {
      expect(hasPermission(admin, p)).toBe(true);
    }
  });

  it("allows TreasuryManager to execute distributions", () => {
    const mgr = makeActor("tm-1", [Role.TreasuryManager]);
    expect(hasPermission(mgr, Permission.ExecuteDistribution)).toBe(true);
    expect(hasPermission(mgr, Permission.CreateDistribution)).toBe(true);
    expect(hasPermission(mgr, Permission.AuditAll)).toBe(false);
  });

  it("allows Approver to approve distributions only", () => {
    const approver = makeActor("app-1", [Role.Approver]);
    expect(hasPermission(approver, Permission.ApproveDistribution)).toBe(true);
    expect(hasPermission(approver, Permission.ExecuteDistribution)).toBe(false);
    expect(hasPermission(approver, Permission.CreateDistribution)).toBe(false);
  });

  it("allows Auditor to view and audit", () => {
    const auditor = makeActor("aud-1", [Role.Auditor]);
    expect(hasPermission(auditor, Permission.AuditAll)).toBe(true);
    expect(hasPermission(auditor, Permission.ViewDistribution)).toBe(true);
    expect(hasPermission(auditor, Permission.ApproveDistribution)).toBe(false);
    expect(hasPermission(auditor, Permission.ExecuteDistribution)).toBe(false);
  });

  it("allows Operator to execute and view", () => {
    const op = makeActor("op-1", [Role.Operator]);
    expect(hasPermission(op, Permission.ExecuteDistribution)).toBe(true);
    expect(hasPermission(op, Permission.ViewDistribution)).toBe(true);
    expect(hasPermission(op, Permission.ApproveDistribution)).toBe(false);
    expect(hasPermission(op, Permission.AuditAll)).toBe(false);
  });

  it("returns false for empty roles", () => {
    const actor = makeActor("no-role", []);
    expect(hasPermission(actor, Permission.CreateDistribution)).toBe(false);
  });

  it("returns false for null actor", () => {
    expect(hasPermission(null as unknown as Actor, Permission.CreateDistribution)).toBe(false);
  });

  it("returns false for actor with no id", () => {
    expect(hasPermission({ id: "", roles: [Role.Admin] }, Permission.CreateDistribution)).toBe(false);
  });

  it("grants permission when actor has at least one role that allows it", () => {
    const actor = makeActor("multi", [Role.Auditor, Role.Approver]);
    expect(hasPermission(actor, Permission.ApproveDistribution)).toBe(true);
    expect(hasPermission(actor, Permission.AuditAll)).toBe(true);
    expect(hasPermission(actor, Permission.ExecuteDistribution)).toBe(false);
  });
});

describe("AuthorizationService", () => {
  let clock: IClock;
  let svc: AuthorizationService;

  beforeEach(() => {
    clock = makeClock();
    svc = new AuthorizationService({ clock });
  });

  it("grants permission for authorized actor", () => {
    const actor = makeActor("admin-1", [Role.Admin]);
    const result = svc.authorize(actor, Permission.ExecuteDistribution);
    expect(result.granted).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("denies permission for unauthorized actor", () => {
    const actor = makeActor("op-1", [Role.Operator]);
    const result = svc.authorize(actor, Permission.ApproveDistribution);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain("lacks permission");
  });

  it("denies for missing actor id", () => {
    const result = svc.authorize({ id: "", roles: [Role.Admin] }, Permission.ExecuteDistribution);
    expect(result.granted).toBe(false);
  });

  it("emits AuthorizationGrantedEvent on success", () => {
    const actor = makeActor("admin-1", [Role.Admin]);
    svc.authorize(actor, Permission.ExecuteDistribution, "dist-1");
    const events = svc.uncommittedEvents;
    expect(events.length).toBe(1);
    expect(events[0]!.eventType).toBe("treasury.security.authorization.granted");
  });

  it("emits AuthorizationDeniedEvent on failure", () => {
    const actor = makeActor("op-1", [Role.Operator]);
    svc.authorize(actor, Permission.ApproveDistribution);
    const events = svc.uncommittedEvents;
    expect(events.length).toBe(1);
    expect(events[0]!.eventType).toBe("treasury.security.authorization.denied");
  });

  it("clearEvents resets event buffer", () => {
    const actor = makeActor("admin-1", [Role.Admin]);
    svc.authorize(actor, Permission.ExecuteDistribution);
    expect(svc.uncommittedEvents.length).toBeGreaterThan(0);
    svc.clearEvents();
    expect(svc.uncommittedEvents.length).toBe(0);
  });
});
