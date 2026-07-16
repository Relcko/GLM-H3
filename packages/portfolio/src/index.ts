export type { PortfolioRepository } from "./repository";
export { InMemoryPortfolioRepository } from "./in-memory-repository";

export { PortfolioService } from "./portfolio/service";
export { PortfolioSnapshotEngine } from "./snapshot/service";
export { AssetAggregator } from "./asset-aggregator/service";
export { InvestmentAggregator } from "./investment-aggregator/service";
export { NftAggregator } from "./nft-aggregator/service";
export { NetworkStatsAdapter } from "./network-stats/adapter";
export { PerformanceEngine } from "./performance/service";
export { ROIEngine } from "./roi/service";
export { AllocationEngine } from "./allocation/service";
export { CashflowProjectionEngine } from "./cashflow/service";
export { PortfolioTimeline } from "./timeline/service";
export { PortfolioAnalytics } from "./analytics/service";
export { PortfolioSearch } from "./search/service";
export { PortfolioExport } from "./export/service";
export { PortfolioHealthEngine } from "./health/service";
export { PortfolioEventsAdapter } from "./events-adapter/adapter";

export { PortfolioModule, createPortfolioModule } from "./composition-root";
export type { PortfolioModuleOptions } from "./composition-root";

export * from "./types";
export * from "./events";
export * from "./errors";
