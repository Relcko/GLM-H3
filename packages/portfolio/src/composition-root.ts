import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { PortfolioRepository } from "./repository";
import { InMemoryPortfolioRepository } from "./in-memory-repository";

import { PortfolioService } from "./portfolio/service";
import { PortfolioSnapshotEngine } from "./snapshot/service";
import { AssetAggregator } from "./asset-aggregator/service";
import { InvestmentAggregator } from "./investment-aggregator/service";
import { NftAggregator } from "./nft-aggregator/service";
import { NetworkStatsAdapter } from "./network-stats/adapter";
import { PerformanceEngine } from "./performance/service";
import { ROIEngine } from "./roi/service";
import { AllocationEngine } from "./allocation/service";
import { CashflowProjectionEngine } from "./cashflow/service";
import { PortfolioTimeline } from "./timeline/service";
import { PortfolioAnalytics } from "./analytics/service";
import { PortfolioSearch } from "./search/service";
import { PortfolioExport } from "./export/service";
import { PortfolioHealthEngine } from "./health/service";
import { ProjectionService } from "./projection/service";
import { PortfolioEventsAdapter } from "./events-adapter/adapter";

export class PortfolioModule {
  constructor(
    public readonly portfolioService: PortfolioService,
    public readonly snapshotEngine: PortfolioSnapshotEngine,
    public readonly assetAggregator: AssetAggregator,
    public readonly investmentAggregator: InvestmentAggregator,
    public readonly nftAggregator: NftAggregator,
    public readonly networkStatsAdapter: NetworkStatsAdapter,
    public readonly performanceEngine: PerformanceEngine,
    public readonly roiEngine: ROIEngine,
    public readonly allocationEngine: AllocationEngine,
    public readonly cashflowEngine: CashflowProjectionEngine,
    public readonly timeline: PortfolioTimeline,
    public readonly analytics: PortfolioAnalytics,
    public readonly search: PortfolioSearch,
    public readonly exportService: PortfolioExport,
    public readonly healthEngine: PortfolioHealthEngine,
    public readonly projectionService: ProjectionService,
    public readonly eventsAdapter: PortfolioEventsAdapter,
    public readonly events: EventBus,
    public readonly performance?: PerformanceModuleContext,
  ) {}
}

export interface PortfolioModuleOptions {
  repository?: PortfolioRepository;
  events: EventBus;
  logger?: Logger;
  autoSubscribe?: boolean;
  performance?: PerformanceModuleContext;
}

export function createPortfolioModule(options: PortfolioModuleOptions): PortfolioModule {
  const repository = options.repository ?? new InMemoryPortfolioRepository();
  const { events, logger } = options;

  const portfolioService = new PortfolioService(repository, events, logger);
  const snapshotEngine = new PortfolioSnapshotEngine(repository, events, logger);
  const assetAggregator = new AssetAggregator(repository, logger);
  const investmentAggregator = new InvestmentAggregator(repository, logger);
  const nftAggregator = new NftAggregator(repository, logger);
  const networkStatsAdapter = new NetworkStatsAdapter(repository, logger);
  const performanceEngine = new PerformanceEngine(repository, events, logger);
  const roiEngine = new ROIEngine(repository, events, logger);
  const allocationEngine = new AllocationEngine(repository, events, logger);
  const cashflowEngine = new CashflowProjectionEngine(repository, events, logger);
  const timeline = new PortfolioTimeline(repository, events, logger);
  const analytics = new PortfolioAnalytics(repository, events, logger);
  const search = new PortfolioSearch(repository, events, logger);
  const exportService = new PortfolioExport(repository, events, logger);
  const healthEngine = new PortfolioHealthEngine(repository, logger);
  const projectionService = new ProjectionService(repository, events, logger);
  const eventsAdapter = new PortfolioEventsAdapter(events, portfolioService, logger, options.performance);

  if (options.autoSubscribe !== false) eventsAdapter.subscribeToExternalEvents();

  return new PortfolioModule(
    portfolioService, snapshotEngine,
    assetAggregator, investmentAggregator, nftAggregator,
    networkStatsAdapter, performanceEngine, roiEngine,
    allocationEngine, cashflowEngine, timeline,
    analytics, search, exportService,
    healthEngine, projectionService, eventsAdapter,
    events, options.performance,
  );
}
