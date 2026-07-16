import type { AuditStore } from "@relcko/audit-contracts";
import type { FlagProvider } from "@relcko/feature-flags";
import type { Logger } from "@relcko/logging";
import type { NotificationSender } from "@relcko/notification-contracts";
import type { EventBus } from "@relcko/events";
import { createEventBus } from "@relcko/events";
import type { OperationsModuleContext } from "@relcko/operations";
import type { PerformanceModuleContext } from "@relcko/performance";
import { PermissionResolver } from "@relcko/permission";
import { createDefaultFlagProvider } from "@relcko/feature-flags";
import { AdministrationAuditService } from "./audit";
import { type AdminDeps } from "./base";
import type { DomainRegistry } from "./ports";
import { InMemoryAdministrationRepository } from "./repository";
import { buildDomainAdministration } from "./domain-admin";
import { AdministrationService } from "./service";
import { AdministrationAnalytics } from "./analytics";
import { AdministrationTimeline } from "./timeline";
import { AdministrationEventAdapter } from "./event-adapter";
import { AdministrationDashboardAdapter } from "./dashboard-adapter";
import type { AdminActor } from "./types";

export interface AdministrationModuleOptions {
  readonly repository?: InMemoryAdministrationRepository;
  readonly events?: EventBus;
  readonly permission?: PermissionResolver;
  readonly auditStore?: AuditStore;
  readonly flags?: FlagProvider;
  readonly sender?: NotificationSender;
  readonly operations?: OperationsModuleContext;
  readonly logger?: Logger;
  /** Domain adapters satisfying the integration seam (Treasury, Governance, ...). */
  readonly domains?: DomainRegistry;
  readonly autoObserve?: boolean;
  readonly performance?: PerformanceModuleContext;
}

export class AdministrationModuleContext {
  constructor(
    public readonly repository: InMemoryAdministrationRepository,
    public readonly events: EventBus,
    public readonly service: AdministrationService,
    public readonly analytics: AdministrationAnalytics,
    public readonly timeline: AdministrationTimeline,
    public readonly eventAdapter: AdministrationEventAdapter,
    public readonly dashboard: AdministrationDashboardAdapter,
    public readonly performance?: PerformanceModuleContext,
  ) {}
}

export function createAdministrationModule(options: AdministrationModuleOptions = {}): AdministrationModuleContext {
  const repository = options.repository ?? new InMemoryAdministrationRepository();
  const events = options.events ?? createEventBus();
  const permission = options.permission ?? new PermissionResolver();
  const auditStore = options.auditStore ?? (new InMemoryRepoAuditStub() as unknown as AuditStore);
  const flags = options.flags ?? createDefaultFlagProvider();
  const audit = new AdministrationAuditService(auditStore);
  const deps: AdminDeps = { permission, events, audit, repo: repository, logger: options.logger };

  const domains = options.domains ?? {};
  const bundle = buildDomainAdministration(deps, domains);

  const service = new AdministrationService(
    deps, bundle,
    { compliance: domains.compliance, kyc: domains.kyc, aml: domains.aml, document: domains.document },
    { auditStore, sender: options.sender, flags, operations: options.operations },
  );

  const analytics = new AdministrationAnalytics(repository);
  const timeline = new AdministrationTimeline(repository);
  const eventAdapter = new AdministrationEventAdapter(events, repository);
  const dashboard = new AdministrationDashboardAdapter(repository, analytics, service.emergency, service.maintenance, permission);

  if (options.autoObserve !== false) eventAdapter.start();

  return new AdministrationModuleContext(repository, events, service, analytics, timeline, eventAdapter, dashboard, options.performance);
}

/** Minimal append-only audit stub so the package is usable without an injected store. */
class InMemoryRepoAuditStub {
  private readonly entries: unknown[] = [];
  async write(entry: unknown): Promise<void> { this.entries.push(entry); }
  async writeMany(entries: readonly unknown[]): Promise<void> { this.entries.push(...entries); }
  async getById(): Promise<undefined> { return undefined; }
  async query(): Promise<readonly unknown[]> { return []; }
}

export type { AdminActor };
