import type { EventBus } from "@relcko/events";
import { createEventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { TreasuryRepository } from "../repository";
import { InMemoryTreasuryRepository } from "../in-memory-repository";

import AccountService from "./account-service";
import AllocationService from "./allocation-service";
import { AnalyticsService } from "./analytics-service";
import { CashflowProjectionService } from "./cashflow-projection-service";
import { HealthService } from "./health-service";
import LedgerService from "./ledger-service";
import MovementService from "./movement-service";
import { ReconciliationService } from "./reconciliation-service";
import { ReportingService } from "./reporting-service";
import ReserveService from "./reserve-service";
import { StatementService } from "./statement-service";
import DividendService from "./dividend-service";
import DividendClaimService from "./dividend-claim-service";
import BuybackService from "./buyback-service";
import BurnService from "./burn-service";

import { TimelineService } from "./timeline-service";
import { SearchService } from "./search-service";
import { EventsAdapter, type EventsAdapterServices } from "./events-adapter";
import { DefaultPortfolioAdapter } from "./portfolio-adapter";
import { DefaultGovernanceAdapter } from "./governance-adapter";

export interface TreasuryContext {
  readonly repo: TreasuryRepository;
  readonly ledgerService: LedgerService;
  readonly accountService: AccountService;
  readonly allocationService: AllocationService;
  readonly reserveService: ReserveService;
  readonly movementService: MovementService;
  readonly reconciliationService: ReconciliationService;
  readonly reportingService: ReportingService;
  readonly analyticsService: AnalyticsService;
  readonly healthService: HealthService;
  readonly dividendService: DividendService;
  readonly dividendClaimService: DividendClaimService;
  readonly buybackService: BuybackService;
  readonly burnService: BurnService;
  readonly statementService: StatementService;
  readonly cashflowProjectionService: CashflowProjectionService;
  readonly timelineService: TimelineService;
  readonly searchService: SearchService;
  readonly eventsAdapter: EventsAdapter;
  readonly portfolioAdapter: DefaultPortfolioAdapter;
  readonly governanceAdapter: DefaultGovernanceAdapter;
  readonly performance?: PerformanceModuleContext;
}

export interface TreasuryContextConfig {
  repository?: TreasuryRepository;
  events?: EventBus;
  logger?: Logger;
  performance?: PerformanceModuleContext;
}

export function createTreasuryContext(config?: TreasuryContextConfig): TreasuryContext {
  const repo = config?.repository ?? new InMemoryTreasuryRepository();
  const events = config?.events ?? createEventBus();
  const logger = config?.logger;
  const performance = config?.performance;

  const ledgerService = new LedgerService(repo, events, logger);
  const accountService = new AccountService(repo, events, logger);
  const allocationService = new AllocationService(repo, events, logger);
  const reserveService = new ReserveService(repo, events, logger);
  const movementService = new MovementService(repo, events, logger);
  const reconciliationService = new ReconciliationService(repo, events, logger);
  const reportingService = new ReportingService(repo, events, logger);
  const analyticsService = new AnalyticsService(repo, events, logger);
  const healthService = new HealthService(repo, events, logger);
  const portfolioAdapter = new DefaultPortfolioAdapter();
  const dividendService = new DividendService(repo, events, portfolioAdapter);
  const dividendClaimService = new DividendClaimService(repo, events);
  const buybackService = new BuybackService(repo, events);
  const burnService = new BurnService(repo, events);
  const statementService = new StatementService(repo, events, logger);
  const cashflowProjectionService = new CashflowProjectionService(repo, events, logger);

  const timelineService = new TimelineService();
  const searchService = new SearchService(repo);
  const governanceAdapter = new DefaultGovernanceAdapter();

  const eventsAdapter = new EventsAdapter(events, repo, {
    ledgerService: ledgerService as unknown as EventsAdapterServices["ledgerService"],
  }, logger, performance);

  eventsAdapter.subscribe();

  return {
    repo,
    ledgerService, accountService, allocationService, reserveService,
    movementService, reconciliationService, reportingService, analyticsService,
    healthService, dividendService, dividendClaimService, buybackService, burnService,
    statementService, cashflowProjectionService,
    timelineService, searchService,
    eventsAdapter, portfolioAdapter, governanceAdapter, performance,
  };
}

export default createTreasuryContext;
