import type { EntityId, Money } from "@relcko/types";
import { Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioAnalyticsEntry, PortfolioPerformanceEntry } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { AnalyticsError } from "../errors";

export class PortfolioAnalytics {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeAnalytics(actorId: EntityId, investorId: EntityId): PortfolioAnalyticsEntry {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    if (!portfolio) throw new AnalyticsError(`Portfolio not found for investor ${investorId}`);

    const holdings = this.repository.listHoldingsByInvestor(investorId);
    const performanceEntries = this.repository.listPerformanceByInvestor(investorId);

    const totalValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const totalInvested = holdings.reduce((s, h) => s + h.costBasis.amount, 0n);
    const totalReturn = totalInvested > 0n
      ? Number((totalValue - totalInvested) * 10000n / totalInvested) / 100
      : 0;
    const roi = portfolio.roi;
    const rentalYield = portfolio.rentalYield;

    const categories = new Set(holdings.map(h => h.assetType));
    const diversificationScore = categories.size > 0
      ? Math.min(Math.round((categories.size / 3) * 100), 100)
      : 0;

    const totalAllocated = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const maxAllocation = holdings.length > 0
      ? Math.max(...holdings.map(h => Number(h.currentValue.amount * 10000n / (totalAllocated > 0n ? totalAllocated : 1n)) / 100))
      : 0;
    const riskScore = Math.min(Math.round(maxAllocation), 100);

    const volatility = this.calculateVolatility(performanceEntries);
    const sharpeRatio = this.calculateSharpeRatio(portfolio.totalReturn, 2);

    let bestPerformer = "";
    let worstPerformer = "";
    if (holdings.length > 0) {
      const sorted = [...holdings].sort((a, b) => b.returnPercentage - a.returnPercentage);
      bestPerformer = sorted[0].name;
      worstPerformer = sorted[sorted.length - 1].name;
    }

    const entry: PortfolioAnalyticsEntry = {
      investorId,
      totalValue: { amount: totalValue, currency: Currency.USDT },
      totalInvested: { amount: totalInvested, currency: Currency.USDT },
      totalReturn,
      roi,
      rentalYield,
      diversificationScore,
      riskScore,
      volatility,
      sharpeRatio,
      bestPerformer,
      worstPerformer,
      computedAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioAnalyticsComputed, portfolio.id, actorId, {
      investorId: investorId as string,
      totalValue: totalValue.toString(),
      roi,
      volatility,
    });

    this.logger?.info("portfolio analytics computed", { investorId, roi, volatility });
    return entry;
  }

  getAnalytics(investorId: EntityId): PortfolioAnalyticsEntry | undefined {
    return this.repository.getLatestAnalytics(investorId);
  }

  calculateVolatility(performanceEntries: PortfolioPerformanceEntry[]): number {
    if (performanceEntries.length < 2) return 0;
    const returns = performanceEntries.map(e => e.returnPercentage);
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  calculateSharpeRatio(returnRate: number, riskFreeRate: number): number {
    const excess = returnRate - riskFreeRate;
    if (excess <= 0) return 0;
    return Math.round((excess / 15) * 100) / 100;
  }
}
