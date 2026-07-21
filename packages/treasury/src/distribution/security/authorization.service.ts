import type { IClock } from "../infrastructure/services/clock";
import {
  AuthorizationGrantedEvent,
  AuthorizationDeniedEvent,
} from "./security-events";

export enum Role {
  Admin = "admin",
  TreasuryManager = "treasury_manager",
  Approver = "approver",
  Auditor = "auditor",
  Operator = "operator",
}

export enum Permission {
  CreateDistribution = "distribution:create",
  ApproveDistribution = "distribution:approve",
  ExecuteDistribution = "distribution:execute",
  CancelDistribution = "distribution:cancel",
  ReconcileDistribution = "distribution:reconcile",
  ViewDistribution = "distribution:view",
  ManageSchedule = "schedule:manage",
  ViewSchedule = "schedule:view",
  ManageReservations = "reservation:manage",
  ViewReservations = "reservation:view",
  ManageApprovals = "approval:manage",
  AuditAll = "audit:all",
}

export interface Actor {
  readonly id: string;
  readonly roles: readonly Role[];
}

export interface AuthorizationResult {
  readonly granted: boolean;
  readonly reason: string | null;
}

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.Admin]: Object.values(Permission),
  [Role.TreasuryManager]: [
    Permission.CreateDistribution,
    Permission.ApproveDistribution,
    Permission.ExecuteDistribution,
    Permission.CancelDistribution,
    Permission.ReconcileDistribution,
    Permission.ViewDistribution,
    Permission.ManageSchedule,
    Permission.ViewSchedule,
    Permission.ManageReservations,
    Permission.ViewReservations,
    Permission.ManageApprovals,
  ],
  [Role.Approver]: [
    Permission.ApproveDistribution,
    Permission.ViewDistribution,
    Permission.ViewSchedule,
    Permission.ManageApprovals,
  ],
  [Role.Auditor]: [
    Permission.ViewDistribution,
    Permission.ViewSchedule,
    Permission.ViewReservations,
    Permission.AuditAll,
  ],
  [Role.Operator]: [
    Permission.ExecuteDistribution,
    Permission.ViewDistribution,
    Permission.ViewSchedule,
    Permission.ViewReservations,
  ],
};

export function hasPermission(actor: Actor, permission: Permission): boolean {
  if (!actor || !actor.id) return false;
  if (!actor.roles || actor.roles.length === 0) return false;
  for (const role of actor.roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions && permissions.includes(permission)) return true;
  }
  return false;
}

export interface AuthorizationServiceDeps {
  readonly clock: IClock;
}

export class AuthorizationService {
  private _eventVersion = 0;
  private _uncommittedEvents: (AuthorizationGrantedEvent | AuthorizationDeniedEvent)[] = [];

  constructor(private readonly deps: AuthorizationServiceDeps) {}

  get uncommittedEvents(): readonly (AuthorizationGrantedEvent | AuthorizationDeniedEvent)[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }

  authorize(
    actor: Actor,
    permission: Permission,
    resourceId?: string,
  ): AuthorizationResult {
    if (!actor || !actor.id) {
      this._emitDenied("unknown", permission, resourceId ?? null, "Actor is missing or has no id");
      return { granted: false, reason: "Actor is missing or has no id" };
    }

    const allowed = hasPermission(actor, permission);
    if (!allowed) {
      const reason = `Actor ${actor.id} with roles [${actor.roles.join(", ")}] lacks permission ${permission}`;
      this._emitDenied(actor.id, permission, resourceId ?? null, reason);
      return { granted: false, reason };
    }

    this._emitGranted(actor.id, permission, resourceId ?? null);
    return { granted: true, reason: null };
  }

  private _emitGranted(actorId: string, action: string, resourceId: string | null): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new AuthorizationGrantedEvent(`actor:${actorId}`, this._eventVersion, {
        actorId,
        action,
        resourceId,
        grantedAt: this.deps.clock.nowMs(),
      }),
    );
  }

  private _emitDenied(actorId: string, action: string, resourceId: string | null, reason: string): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new AuthorizationDeniedEvent(`actor:${actorId}`, this._eventVersion, {
        actorId,
        action,
        resourceId,
        reason,
        deniedAt: this.deps.clock.nowMs(),
      }),
    );
  }
}
