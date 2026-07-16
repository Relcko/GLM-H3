import type { EntityId, Money, Currency, Timestamp } from "@relcko/types";
import type { Rank, ActiveStatusValue } from "@relcko/network-engine";

export interface Portfolio {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly totalInvested: Money;
  readonly currentValue: Money;
  readonly unrealizedGainLoss: bigint;
  readonly realizedGainLoss: bigint;
  readonly totalReturn: number;
  readonly roi: number;
  readonly rentalYield: number;
  readonly expectedAnnualIncome: Money;
  readonly lastComputedAt: Timestamp;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface PortfolioSnapshot {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly totalInvested: Money;
  readonly currentValue: Money;
  readonly unrealizedGainLoss: bigint;
  readonly realizedGainLoss: bigint;
  readonly roi: number;
  readonly rentalYield: number;
  readonly assetCount: number;
  readonly nftCount: number;
  readonly investmentCount: number;
  readonly period: string;
  readonly snapshotAt: Timestamp;
  readonly createdAt: Timestamp;
}

export interface PortfolioSummary {
  readonly totalPortfolioValue: Money;
  readonly totalInvested: Money;
  readonly currentMarketValue: Money;
  readonly unrealizedGainLoss: bigint;
  readonly realizedGainLoss: bigint;
  readonly roi: number;
  readonly rentalYield: number;
  readonly expectedAnnualIncome: Money;
  readonly assetAllocation: readonly AssetAllocationEntry[];
  readonly geographicAllocation: readonly GeographicAllocationEntry[];
  readonly propertyTypeAllocation: readonly PropertyTypeAllocationEntry[];
  readonly computedAt: Timestamp;
}

export interface AssetAllocationEntry {
  readonly category: string;
  readonly value: Money;
  readonly percentage: number;
}

export interface GeographicAllocationEntry {
  readonly region: string;
  readonly value: Money;
  readonly percentage: number;
}

export interface PropertyTypeAllocationEntry {
  readonly propertyType: string;
  readonly value: Money;
  readonly percentage: number;
}

export interface PortfolioHolding {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly assetType: PortfolioAssetType;
  readonly assetId: EntityId;
  readonly name: string;
  readonly quantity: bigint;
  readonly costBasis: Money;
  readonly currentValue: Money;
  readonly profitLoss: bigint;
  readonly returnPercentage: number;
  readonly acquiredAt: Timestamp;
}

export enum PortfolioAssetType {
  Investment = "investment",
  Nft = "nft",
  Fraction = "fraction",
}

export interface PortfolioPerformanceEntry {
  readonly period: string;
  readonly startValue: Money;
  readonly endValue: Money;
  readonly netContribution: Money;
  readonly gainLoss: bigint;
  readonly returnPercentage: number;
  readonly computedAt: Timestamp;
}

export interface ROIResult {
  readonly roi: number;
  readonly annualizedRoi: number;
  readonly totalReturn: bigint;
  readonly holdingPeriod: number;
  readonly investmentAmount: Money;
  readonly currentValue: Money;
  readonly cashflowReceived: Money;
}

export interface AllocationResult {
  readonly assetAllocation: readonly AssetAllocationEntry[];
  readonly geographicAllocation: readonly GeographicAllocationEntry[];
  readonly propertyTypeAllocation: readonly PropertyTypeAllocationEntry[];
  readonly diversificationScore: number;
}

export interface CashflowProjection {
  readonly entries: readonly CashflowEntry[];
  readonly totalProjected: Money;
  readonly monthlyAverage: Money;
  readonly annualProjected: Money;
  readonly projectionPeriodMonths: number;
}

export interface CashflowEntry {
  readonly month: string;
  readonly projectedIncome: Money;
  readonly projectedExpenses: Money;
  readonly netCashflow: bigint;
  readonly source: string;
}

export interface TimelineEntry {
  readonly id: EntityId;
  readonly portfolioId: EntityId;
  readonly eventType: string;
  readonly description: string;
  readonly amount?: Money;
  readonly assetType?: PortfolioAssetType;
  readonly assetId?: EntityId;
  readonly occurredAt: Timestamp;
}

export interface PortfolioAnalyticsEntry {
  readonly investorId: EntityId;
  readonly totalValue: Money;
  readonly totalInvested: Money;
  readonly totalReturn: number;
  readonly roi: number;
  readonly rentalYield: number;
  readonly diversificationScore: number;
  readonly riskScore: number;
  readonly volatility: number;
  readonly sharpeRatio: number;
  readonly bestPerformer: string;
  readonly worstPerformer: string;
  readonly computedAt: Timestamp;
}

export interface SearchQuery {
  readonly query?: string;
  readonly assetType?: PortfolioAssetType;
  readonly dateFrom?: Timestamp;
  readonly dateTo?: Timestamp;
  readonly minAmount?: bigint;
  readonly maxAmount?: bigint;
  readonly sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  readonly page?: number;
  readonly pageSize?: number;
}

export interface SearchResult {
  readonly items: readonly SearchResultItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface SearchResultItem {
  readonly id: EntityId;
  readonly type: "property" | "nft" | "investment" | "transaction" | "document";
  readonly title: string;
  readonly subtitle: string;
  readonly amount?: Money;
  readonly date: Timestamp;
  readonly status: string;
}

export enum ExportFormat {
  Pdf = "pdf",
  Csv = "csv",
  Excel = "excel",
  Tax = "tax",
}

export interface ExportRequest {
  readonly format: ExportFormat;
  readonly investorId: EntityId;
  readonly period?: string;
  readonly includeHoldings: boolean;
  readonly includeTransactions: boolean;
  readonly includePerformance: boolean;
  readonly includeTax: boolean;
}

export interface ExportResult {
  readonly id: EntityId;
  readonly format: ExportFormat;
  readonly url: string;
  readonly size: number;
  readonly generatedAt: Timestamp;
}

export interface PortfolioHealthResult {
  readonly score: number;
  readonly diversificationScore: number;
  readonly riskScore: number;
  readonly liquidityScore: number;
  readonly concentrationRisk: boolean;
  readonly underperformingAssets: readonly string[];
  readonly recommendations: readonly string[];
}

export interface NetworkStatsEntry {
  readonly rank: Rank;
  readonly teamSize: number;
  readonly activeTeam: number;
  readonly monthlyVolume: bigint;
  readonly lifetimeVolume: bigint;
  readonly pendingCommissions: Money;
  readonly recoveredCommissions: Money;
  readonly leaderboardPosition?: number;
  readonly performanceScore: number;
  readonly computedAt: Timestamp;
}

export interface InvestmentAggregation {
  readonly totalInvested: Money;
  readonly currentValue: Money;
  readonly totalReturn: bigint;
  readonly holdings: readonly PortfolioHolding[];
  readonly count: number;
}

export interface NftAggregation {
  readonly totalNfts: number;
  readonly totalCollections: number;
  readonly nftValue: Money;
  readonly entries: readonly PortfolioHolding[];
}
