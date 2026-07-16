import { Role, ScopeType } from "@relcko/types";

export enum Action {
  Browse = "browse",
  Invest = "invest",
  ListSell = "list_sell",
  ClaimDividend = "claim_dividend",
  ReferEarn = "refer_earn",
  ManageReferrals = "manage_referrals",
  ViewTeam = "view_team",
  ReviewKyc = "review_kyc",
  RaiseComplianceFlag = "raise_compliance_flag",
  PublishProperty = "publish_property",
  InitiateTreasury = "initiate_treasury",
  ApproveTreasury = "approve_treasury",
  CreateGovernance = "create_governance",
  ExecuteGovernance = "execute_governance",
  ManageCampaigns = "manage_campaigns",
  ManageUsers = "manage_users",
  AssignAdmin = "assign_admin",
  EmergencyPause = "emergency_pause",
  ReadAudit = "read_audit",
}

export enum MfaLevel {
  None = "none",
  Totp = "totp",
  Hardware = "hardware",
}

export interface Policy {
  readonly action: Action;
  /** Minimum roles able to perform the action (evaluated via inheritance). */
  readonly requiredRoles: readonly Role[];
  readonly scope: ScopeType;
  /** Sensitive actions require a second approver (two-stage gating). */
  readonly sensitive?: boolean;
  readonly requiresSecondApprover?: boolean;
  /** Blocked until KYC approved (when the compliance.kycRequired flag is on). */
  readonly requiresKyc?: boolean;
  readonly requiresMfa?: MfaLevel;
  /** Adaptive-auth: deny when subject risk score exceeds this. */
  readonly maxRiskScore?: number;
}

const ALL_ROLES: readonly Role[] = Object.values(Role);

export const POLICIES: Readonly<Record<Action, Policy>> = {
  [Action.Browse]: { action: Action.Browse, requiredRoles: ALL_ROLES, scope: ScopeType.Global },
  [Action.Invest]: {
    action: Action.Invest,
    requiredRoles: [Role.Investor, Role.Agent, Role.SeniorAgent],
    scope: ScopeType.Own,
    requiresKyc: true,
  },
  [Action.ListSell]: {
    action: Action.ListSell,
    requiredRoles: [Role.Investor, Role.Agent, Role.SeniorAgent],
    scope: ScopeType.Own,
  },
  [Action.ClaimDividend]: {
    action: Action.ClaimDividend,
    requiredRoles: [Role.Investor, Role.Agent, Role.SeniorAgent],
    scope: ScopeType.Own,
  },
  [Action.ReferEarn]: {
    action: Action.ReferEarn,
    requiredRoles: [Role.Investor, Role.Agent, Role.SeniorAgent],
    scope: ScopeType.Own,
  },
  [Action.ManageReferrals]: {
    action: Action.ManageReferrals,
    requiredRoles: [Role.Agent, Role.SeniorAgent],
    scope: ScopeType.Own,
  },
  [Action.ViewTeam]: { action: Action.ViewTeam, requiredRoles: [Role.SeniorAgent], scope: ScopeType.Team },
  [Action.ReviewKyc]: {
    action: Action.ReviewKyc,
    requiredRoles: [Role.ComplianceOfficer, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
  },
  [Action.RaiseComplianceFlag]: {
    action: Action.RaiseComplianceFlag,
    requiredRoles: [Role.ComplianceOfficer],
    scope: ScopeType.Discipline,
  },
  [Action.PublishProperty]: {
    action: Action.PublishProperty,
    requiredRoles: [Role.PropertyManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
  },
  [Action.InitiateTreasury]: {
    action: Action.InitiateTreasury,
    requiredRoles: [Role.TreasuryManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
    sensitive: true,
    requiresSecondApprover: true,
    requiresMfa: MfaLevel.Hardware,
  },
  [Action.ApproveTreasury]: {
    action: Action.ApproveTreasury,
    requiredRoles: [Role.TreasuryManager, Role.GovernanceManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
    sensitive: true,
    requiresSecondApprover: true,
    requiresMfa: MfaLevel.Hardware,
  },
  [Action.CreateGovernance]: {
    action: Action.CreateGovernance,
    requiredRoles: [Role.GovernanceManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
  },
  [Action.ExecuteGovernance]: {
    action: Action.ExecuteGovernance,
    requiredRoles: [Role.GovernanceManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
    sensitive: true,
    requiresSecondApprover: true,
    requiresMfa: MfaLevel.Hardware,
  },
  [Action.ManageCampaigns]: {
    action: Action.ManageCampaigns,
    requiredRoles: [Role.GovernanceManager, Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Discipline,
  },
  [Action.ManageUsers]: {
    action: Action.ManageUsers,
    requiredRoles: [Role.Administrator, Role.SuperAdministrator],
    scope: ScopeType.Global,
  },
  [Action.AssignAdmin]: {
    action: Action.AssignAdmin,
    requiredRoles: [Role.SuperAdministrator],
    scope: ScopeType.Global,
    sensitive: true,
  },
  [Action.EmergencyPause]: {
    action: Action.EmergencyPause,
    requiredRoles: [Role.SuperAdministrator],
    scope: ScopeType.Global,
    sensitive: true,
  },
  [Action.ReadAudit]: {
    action: Action.ReadAudit,
    requiredRoles: [
      Role.ComplianceOfficer,
      Role.PropertyManager,
      Role.TreasuryManager,
      Role.GovernanceManager,
      Role.Administrator,
      Role.SuperAdministrator,
    ],
    scope: ScopeType.Discipline,
  },
};
