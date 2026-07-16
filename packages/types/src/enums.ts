/**
 * Canonical enumerations shared across the platform.
 * Sourced from PERMISSION_MODEL.md (roles, scopes) and DOMAIN_MODEL.md.
 */

/** The 10 platform roles (PERMISSION_MODEL.md §2). Additive hierarchy. */
export enum Role {
  Anonymous = "anonymous",
  Investor = "investor",
  Agent = "agent",
  SeniorAgent = "senior_agent",
  ComplianceOfficer = "compliance_officer",
  PropertyManager = "property_manager",
  TreasuryManager = "treasury_manager",
  GovernanceManager = "governance_manager",
  Administrator = "administrator",
  SuperAdministrator = "super_administrator",
}

/** Authorization scopes (PERMISSION_MODEL.md §4). */
export enum ScopeType {
  Own = "own",
  Team = "team",
  Discipline = "discipline",
  Global = "global",
  Grant = "grant",
}

/** Standard currencies accepted by the platform. */
export enum Currency {
  USDT = "USDT",
  USDC = "USDC",
  Native = "NATIVE",
}

/** Allowed payment methods (DOMAIN_MODEL.md §18). */
export enum PaymentMethod {
  OnchainStablecoin = "onchain_stablecoin",
  Fiat = "fiat",
  Native = "native",
}

/** Severity levels for alerts / observability (OBSERVABILITY_ARCHITECTURE.md §3). */
export enum Severity {
  Info = "info",
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}
