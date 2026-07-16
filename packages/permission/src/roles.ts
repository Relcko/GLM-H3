import { Role } from "@relcko/types";

/**
 * Additive role inheritance (PERMISSION_MODEL.md §2). Cross-cutting manager
 * roles are functional specializations and do NOT inherit Investor trading
 * rights. Super Administrator additionally holds Administrator.
 */
const ROLE_INCLUDES: Readonly<Record<Role, readonly Role[]>> = {
  [Role.Anonymous]: [Role.Anonymous],
  [Role.Investor]: [Role.Anonymous, Role.Investor],
  [Role.Agent]: [Role.Anonymous, Role.Investor, Role.Agent],
  [Role.SeniorAgent]: [Role.Anonymous, Role.Investor, Role.Agent, Role.SeniorAgent],
  [Role.ComplianceOfficer]: [Role.ComplianceOfficer],
  [Role.PropertyManager]: [Role.PropertyManager],
  [Role.TreasuryManager]: [Role.TreasuryManager],
  [Role.GovernanceManager]: [Role.GovernanceManager],
  [Role.Administrator]: [Role.Administrator],
  [Role.SuperAdministrator]: [Role.Administrator, Role.SuperAdministrator],
};

export function effectiveRoles(role: Role): ReadonlySet<Role> {
  return new Set(ROLE_INCLUDES[role] ?? [role]);
}

export function roleSatisfies(actor: Role, required: Role): boolean {
  return effectiveRoles(actor).has(required);
}

/** True if `actor` has at least one of `required` roles (via inheritance). */
export function hasAnyRole(actor: Role, required: readonly Role[]): boolean {
  const effective = effectiveRoles(actor);
  return required.some((r) => effective.has(r));
}

/** Manager disciplines are mutually exclusive from the investing path. */
export const MANAGER_ROLES: readonly Role[] = [
  Role.ComplianceOfficer,
  Role.PropertyManager,
  Role.TreasuryManager,
  Role.GovernanceManager,
];

export function isManagerRole(role: Role): boolean {
  return MANAGER_ROLES.includes(role);
}
