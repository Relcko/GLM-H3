import type { AuditStore } from "@relcko/audit-contracts";
import type { FlagProvider } from "@relcko/feature-flags";
import type { Logger } from "@relcko/logging";
import type { NotificationSender } from "@relcko/notification-contracts";
import type { EventBus } from "@relcko/events";
import type { OperationsModuleContext } from "@relcko/operations";
import { PermissionResolver } from "@relcko/permission";
import { AdministrationAuditService } from "./audit";
import { type AdminDeps, BaseAdministration } from "./base";
import type { DomainRegistry } from "./ports";
import { InMemoryAdministrationRepository } from "./repository";
import {
  AgentAdministration, AiAdministration, GovernanceAdministration, InvestmentAdministration,
  MarketplaceAdministration, NftAdministration, PortfolioAdministration, PropertyAdministration,
  RoleAdministration, TreasuryAdministration, UserAdministration, PermissionAdministration,
  buildDomainAdministration,
} from "./domain-admin";
import {
  AmlAdministration, AnnouncementAdministration, AuditAdministration, BackupAdministration,
  ComplianceAdministration, ConfigurationAdministration, DocumentAdministration,
  EmergencyAdministration, FeatureFlagAdministration, JobAdministration, KycAdministration,
  NotificationAdministration, OperationsAdministration, SearchAdministration,
  SystemMaintenanceAdministration,
} from "./platform-admin";
import { AdministrationAnalytics } from "./analytics";
import { AdministrationTimeline } from "./timeline";
import { AdministrationEventAdapter } from "./event-adapter";
import { AdministrationDashboardAdapter } from "./dashboard-adapter";
import type { AdminActor, AdminArea, AdminResourceContext } from "./types";
import { assertAreaAuthorized } from "./authorization";
import { Action, type AuthorizationContext } from "@relcko/permission";

/**
 * Central facade for the Enterprise Administration Platform. Orchestrates every
 * domain administration area through role-based authorization, immutable audit,
 * canonical events, and reuse of the Operations package for monitoring. It never
 * duplicates business logic — each area delegates to a port or domain service.
 */
export class AdministrationService {
  readonly user: UserAdministration;
  readonly role: RoleAdministration;
  readonly permission: PermissionAdministration;
  readonly agent: AgentAdministration;
  readonly marketplace: MarketplaceAdministration;
  readonly property: PropertyAdministration;
  readonly investment: InvestmentAdministration;
  readonly nft: NftAdministration;
  readonly portfolio: PortfolioAdministration;
  readonly treasury: TreasuryAdministration;
  readonly governance: GovernanceAdministration;
  readonly ai: AiAdministration;
  readonly compliance: ComplianceAdministration;
  readonly kyc: KycAdministration;
  readonly aml: AmlAdministration;
  readonly document: DocumentAdministration;
  readonly audit: AuditAdministration;
  readonly operations: OperationsAdministration;
  readonly notification: NotificationAdministration;
  readonly configuration: ConfigurationAdministration;
  readonly featureFlag: FeatureFlagAdministration;
  readonly emergency: EmergencyAdministration;
  readonly maintenance: SystemMaintenanceAdministration;
  readonly backup: BackupAdministration;
  readonly job: JobAdministration;
  readonly announcement: AnnouncementAdministration;
  readonly search: SearchAdministration;

  constructor(
    private readonly deps: AdminDeps,
    bundle: ReturnType<typeof buildDomainAdministration>,
    ports: {
      compliance?: DomainRegistry["compliance"];
      kyc?: DomainRegistry["kyc"];
      aml?: DomainRegistry["aml"];
      document?: DomainRegistry["document"];
    },
    extras: {
      auditStore: AuditStore;
      sender?: NotificationSender;
      flags: FlagProvider;
      operations?: OperationsModuleContext;
    },
  ) {
    this.user = bundle.user;
    this.role = bundle.role;
    this.permission = bundle.permission;
    this.agent = bundle.agent;
    this.marketplace = bundle.marketplace;
    this.property = bundle.property;
    this.investment = bundle.investment;
    this.nft = bundle.nft;
    this.portfolio = bundle.portfolio;
    this.treasury = bundle.treasury;
    this.governance = bundle.governance;
    this.ai = bundle.ai;
    this.compliance = new ComplianceAdministration(deps, ports.compliance);
    this.kyc = new KycAdministration(deps, ports.kyc);
    this.aml = new AmlAdministration(deps, ports.aml);
    this.document = new DocumentAdministration(deps, ports.document);
    this.audit = new AuditAdministration(deps, extras.auditStore);
    this.operations = new OperationsAdministration(deps, extras.operations);
    this.notification = new NotificationAdministration(deps, extras.sender);
    this.configuration = new ConfigurationAdministration(deps);
    this.featureFlag = new FeatureFlagAdministration(deps, extras.flags);
    this.emergency = new EmergencyAdministration(deps);
    this.maintenance = new SystemMaintenanceAdministration(deps);
    this.backup = new BackupAdministration(deps);
    this.job = new JobAdministration(deps);
    this.announcement = new AnnouncementAdministration(deps);
    this.search = new SearchAdministration(deps);
  }

  /** Authorize raw access to an administration area (used by gateways/UI seams). */
  canAccess(actor: AdminActor, area: AdminArea, resource: AdminResourceContext = {}, env: AuthorizationContext["env"] = {}): boolean {
    try {
      assertAreaAuthorized(this.deps.permission, actor, area, resource, env);
      return true;
    } catch {
      return false;
    }
  }

  requirePermission(action: Action, auth: AuthorizationContext): void {
    this.deps.permission.assertAuthorized(auth, action);
  }
}

export type { BaseAdministration, AdministrationAnalytics, AdministrationTimeline, AdministrationEventAdapter, AdministrationDashboardAdapter };
