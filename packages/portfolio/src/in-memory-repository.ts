import type { EntityId } from "@relcko/types";
import type { PortfolioRepository } from "./repository";
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

export class InMemoryPortfolioRepository implements PortfolioRepository {
  private readonly portfolios = new Map<EntityId, Portfolio>();
  private readonly portfoliosByInvestor = new Map<EntityId, EntityId>();
  private readonly snapshots = new Map<EntityId, PortfolioSnapshot>();
  private readonly holdings = new Map<EntityId, PortfolioHolding>();
  private readonly performance = new Map<string, PortfolioPerformanceEntry>();
  private readonly timeline = new Map<EntityId, TimelineEntry[]>();
  private readonly analytics = new Map<EntityId, PortfolioAnalyticsEntry>();
  private readonly health = new Map<EntityId, PortfolioHealthResult>();
  private readonly exports = new Map<EntityId, ExportResult[]>();
  private readonly networkStats = new Map<EntityId, NetworkStatsEntry>();
  private readonly processedEvents = new Set<string>();

  savePortfolio(p: Portfolio): void {
    this.portfolios.set(p.id, p);
    this.portfoliosByInvestor.set(p.investorId, p.id);
  }

  getPortfolio(id: EntityId): Portfolio | undefined {
    return this.portfolios.get(id);
  }

  getPortfolioByInvestor(investorId: EntityId): Portfolio | undefined {
    const id = this.portfoliosByInvestor.get(investorId);
    return id ? this.portfolios.get(id) : undefined;
  }

  saveSnapshot(s: PortfolioSnapshot): void {
    this.snapshots.set(s.id, s);
  }

  getSnapshot(id: EntityId): PortfolioSnapshot | undefined {
    return this.snapshots.get(id);
  }

  listSnapshotsByInvestor(investorId: EntityId): PortfolioSnapshot[] {
    return Array.from(this.snapshots.values()).filter(s => s.investorId === investorId);
  }

  listSnapshotsByPeriod(investorId: EntityId, period: string): PortfolioSnapshot[] {
    return this.listSnapshotsByInvestor(investorId).filter(s => s.period === period);
  }

  saveHolding(h: PortfolioHolding): void {
    this.holdings.set(h.id, h);
  }

  getHolding(id: EntityId): PortfolioHolding | undefined {
    return this.holdings.get(id);
  }

  listHoldingsByInvestor(investorId: EntityId): PortfolioHolding[] {
    return Array.from(this.holdings.values()).filter(h => h.investorId === investorId);
  }

  listHoldingsByAsset(investorId: EntityId, assetType: PortfolioAssetType): PortfolioHolding[] {
    return this.listHoldingsByInvestor(investorId).filter(h => h.assetType === assetType);
  }

  removeHolding(id: EntityId): void {
    this.holdings.delete(id);
  }

  savePerformanceEntry(e: PortfolioPerformanceEntry): void {
    this.performance.set(`${e.period}`, e);
  }

  listPerformanceByInvestor(investorId: EntityId): PortfolioPerformanceEntry[] {
    return Array.from(this.performance.values());
  }

  listPerformanceByPeriod(investorId: EntityId, period: string): PortfolioPerformanceEntry | undefined {
    return this.performance.get(period);
  }

  saveTimelineEntry(e: TimelineEntry): void {
    const key = e.portfolioId;
    const existing = this.timeline.get(key) ?? [];
    existing.push(e);
    this.timeline.set(key, existing);
  }

  listTimelineByPortfolio(portfolioId: EntityId): TimelineEntry[] {
    return this.timeline.get(portfolioId) ?? [];
  }

  listTimelineByInvestor(investorId: EntityId): TimelineEntry[] {
    const result: TimelineEntry[] = [];
    for (const entries of this.timeline.values()) {
      result.push(...entries);
    }
    return result;
  }

  saveAnalytics(a: PortfolioAnalyticsEntry): void {
    this.analytics.set(a.investorId, a);
  }

  getLatestAnalytics(investorId: EntityId): PortfolioAnalyticsEntry | undefined {
    return this.analytics.get(investorId);
  }

  saveHealthResult(investorId: EntityId, h: PortfolioHealthResult): void {
    this.health.set(investorId, h);
  }

  getHealthResult(investorId: EntityId): PortfolioHealthResult | undefined {
    return this.health.get(investorId);
  }

  saveExportResult(r: ExportResult): void {
    const key = r.id;
    const existing = this.exports.get(key) ?? [];
    existing.push(r);
    this.exports.set(key, existing);
  }

  listExportResults(investorId: EntityId): ExportResult[] {
    const result: ExportResult[] = [];
    for (const entries of this.exports.values()) {
      result.push(...entries);
    }
    return result;
  }

  saveNetworkStats(investorId: EntityId, s: NetworkStatsEntry): void {
    this.networkStats.set(investorId, s);
  }

  getNetworkStats(investorId: EntityId): NetworkStatsEntry | undefined {
    return this.networkStats.get(investorId);
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}
