import { Action, PermissionResolver, type AuthorizationContext, type SubjectContext } from "@relcko/permission";
import type { AdminActor, AdminArea, AdminResourceContext } from "./types";

/**
 * Resolve the platform `Action` that gates a given administration area.
 * Reuses the existing Permission Engine — no new authorization model.
 *
 * - Most control-plane operations require Administrator/SuperAdministrator (ManageUsers).
 * - Emergency controls are reserved for SuperAdministrator (EmergencyPause).
 * - Audit access follows ReadAudit (admin-like roles + discipline scope).
 * - Sensitive Treasury/Governance operations inherit their two-stage gating
 *   (second approver + hardware MFA) via InitiateTreasury / CreateGovernance.
 */
export function resolvePermissionAction(area: AdminArea): Action {
  switch (area) {
    case "emergency": return Action.EmergencyPause;
    case "audit": return Action.ReadAudit;
    case "treasury": return Action.InitiateTreasury;
    case "governance": return Action.CreateGovernance;
    case "kyc": return Action.ReviewKyc;
    default: return Action.ManageUsers;
  }
}

export function toSubjectContext(actor: AdminActor): SubjectContext {
  return {
    id: actor.id,
    role: actor.role,
    kycApproved: actor.kycApproved,
    mfaLevel: actor.mfaLevel,
    riskScore: actor.riskScore,
  };
}

export function buildAuthContext(
  actor: AdminActor,
  resource: AdminResourceContext = {},
  env: AuthorizationContext["env"] = {},
): AuthorizationContext {
  return {
    subject: toSubjectContext(actor),
    resource: { ownerId: resource.ownerId, entityType: resource.entityType, jurisdiction: resource.jurisdiction },
    env,
  };
}

/** Assert that `actor` may perform administrative actions in `area`. Throws PermissionError. */
export function assertAreaAuthorized(
  permission: PermissionResolver,
  actor: AdminActor,
  area: AdminArea,
  resource: AdminResourceContext = {},
  env: AuthorizationContext["env"] = {},
): void {
  const action = resolvePermissionAction(area);
  permission.assertAuthorized(buildAuthContext(actor, resource, env), action);
}
