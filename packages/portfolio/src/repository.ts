import type { EntityId, Money } from "@relcko/types";
import type {
  Portfolio,
  PortfolioSnapshot,
  PortfolioHolding,
  PortfolioPerformanceEntry,
  TimelineEntry,
  PortfolioAnalyticsEntry,
  PortfolioHealthResult,
  ExportResult,
  NetworkStatsEntry,
  PortfolioAssetType,
} from "./types";

export interface PortfolioRepository {
  savePortfolio(p: Portfolio): void;
  getPortfolio(id: EntityId): Portfolio | undefined;
  getPortfolioByInvestor(investorId: EntityId): Portfolio | undefined;

  saveSnapshot(s: PortfolioSnapshot): void;
  getSnapshot(id: EntityId): PortfolioSnapshot | undefined;
  listSnapshotsByInvestor(investorId: EntityId): PortfolioSnapshot[];
  listSnapshotsByPeriod(investorId: EntityId, period: string): PortfolioSnapshot[];

  saveHolding(h: PortfolioHolding): void;
  getHolding(id: EntityId): PortfolioHolding | undefined;
  listHoldingsByInvestor(investorId: EntityId): PortfolioHolding[];
  listHoldingsByAsset(investorId: EntityId, assetType: PortfolioAssetType): PortfolioHolding[];
  removeHolding(id: EntityId): void;

  savePerformanceEntry(e: PortfolioPerformanceEntry): void;
  listPerformanceByInvestor(investorId: EntityId): PortfolioPerformanceEntry[];
  listPerformanceByPeriod(investorId: EntityId, period: string): PortfolioPerformanceEntry | undefined;

  saveTimelineEntry(e: TimelineEntry): void;
  listTimelineByPortfolio(portfolioId: EntityId): TimelineEntry[];
  listTimelineByInvestor(investorId: EntityId): TimelineEntry[];

  saveAnalytics(a: PortfolioAnalyticsEntry): void;
  getLatestAnalytics(investorId: EntityId): PortfolioAnalyticsEntry | undefined;

  saveHealthResult(investorId: EntityId, h: PortfolioHealthResult): void;
  getHealthResult(investorId: EntityId): PortfolioHealthResult | undefined;

  saveExportResult(r: ExportResult): void;
  listExportResults(investorId: EntityId): ExportResult[];

  saveNetworkStats(investorId: EntityId, s: NetworkStatsEntry): void;
  getNetworkStats(investorId: EntityId): NetworkStatsEntry | undefined;

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
