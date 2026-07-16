import type { AuditReader } from "@relcko/audit-contracts";
import { createInMemoryAuditStore } from "@relcko/audit-contracts";
import type { EventBus } from "@relcko/events";
import { createEventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { PermissionResolver } from "@relcko/permission";
import type { PerformanceModuleContext } from "@relcko/performance";
import {
  AiMonitor, ApiMonitor, BlockchainMonitor, DatabaseMonitor, DistributedTraceModel,
  EventMonitoringService, IdentityMonitor, InvestmentMonitor, LogAggregationService,
  MarketplaceMonitor, MetricsEngine, NetworkMonitor, NftMonitor, PerformanceMonitor,
  PortfolioMonitor, QueueMonitor, SystemMonitor, TelemetryEngine, TreasuryMonitor,
  GovernanceMonitor, WorkerMonitor, emptyResourceProbe,
} from "./monitoring";
import { InMemoryOperationsRepository, type OperationsRepository } from "./repository";
import {
  AlertEngine, AuditQueryService, HealthReportGenerator, IncidentTimeline, OperationsAnalytics,
  OperationsDashboardAdapter, OperationsService, SystemHealthEngine,
} from "./services";
import type { OperationsModule, ResourceProbe } from "./types";

export interface OperationsModuleOptions {
  readonly repository?: OperationsRepository;
  readonly events?: EventBus;
  readonly permission?: PermissionResolver;
  readonly audit?: AuditReader;
  readonly logger?: Logger;
  readonly probes?: Partial<Record<OperationsModule, ResourceProbe>>;
  readonly autoStart?: boolean;
  readonly performance?: PerformanceModuleContext;
}

export class OperationsModuleContext {
  constructor(
    public readonly repository: OperationsRepository,
    public readonly events: EventBus,
    public readonly metrics: MetricsEngine,
    public readonly telemetry: TelemetryEngine,
    public readonly tracing: DistributedTraceModel,
    public readonly logs: LogAggregationService,
    public readonly eventMonitoring: EventMonitoringService,
    public readonly performance: PerformanceMonitor,
    public readonly queues: QueueMonitor,
    public readonly workers: WorkerMonitor,
    public readonly health: SystemHealthEngine,
    public readonly alerts: AlertEngine,
    public readonly auditQuery: AuditQueryService,
    public readonly analytics: OperationsAnalytics,
    public readonly incidents: IncidentTimeline,
    public readonly reports: HealthReportGenerator,
    public readonly dashboard: OperationsDashboardAdapter,
    public readonly operations: OperationsService,
    public readonly performanceModule?: PerformanceModuleContext,
  ) {}
}

export function createOperationsModule(options: OperationsModuleOptions = {}): OperationsModuleContext {
  const repository = options.repository ?? new InMemoryOperationsRepository();
  const events = options.events ?? createEventBus();
  const permission = options.permission ?? new PermissionResolver();
  const audit = options.audit ?? createInMemoryAuditStore();
  const performanceModule = options.performance;
  const metrics = new MetricsEngine(repository);
  const telemetry = new TelemetryEngine(repository);
  const tracing = new DistributedTraceModel(repository);
  const logs = new LogAggregationService(repository);
  const eventMonitoring = new EventMonitoringService(events, repository, metrics, options.logger);
  const performance = new PerformanceMonitor(metrics);
  const queues = new QueueMonitor(events, repository, metrics);
  const workers = new WorkerMonitor(repository, metrics);
  const health = new SystemHealthEngine(repository, metrics, events);
  const probe = (module: OperationsModule) => options.probes?.[module] ?? emptyResourceProbe;

  health.register(new SystemMonitor(probe("system")));
  health.register(new ApiMonitor(probe("api")));
  health.register(new DatabaseMonitor(probe("database")));
  health.register(new BlockchainMonitor(probe("blockchain")));
  health.register(new AiMonitor(probe("ai")));
  health.register(new MarketplaceMonitor(probe("marketplace")));
  health.register(new TreasuryMonitor(probe("treasury")));
  health.register(new GovernanceMonitor(probe("governance")));
  health.register(new IdentityMonitor(probe("identity")));
  health.register(new PortfolioMonitor(probe("portfolio")));
  health.register(new NetworkMonitor(probe("network")));
  health.register(new InvestmentMonitor(probe("investment")));
  health.register(new NftMonitor(probe("nft")));

  const alerts = new AlertEngine(repository, events);
  const auditQuery = new AuditQueryService(audit, permission);
  const analytics = new OperationsAnalytics(repository);
  const incidents = new IncidentTimeline(repository, events);
  const reports = new HealthReportGenerator(events);
  const dashboard = new OperationsDashboardAdapter(repository, analytics, health, permission);
  const operations = new OperationsService(repository, permission);
  if (options.autoStart !== false) eventMonitoring.start();

  return new OperationsModuleContext(repository, events, metrics, telemetry, tracing, logs, eventMonitoring, performance, queues, workers, health, alerts, auditQuery, analytics, incidents, reports, dashboard, operations, performanceModule);
}
