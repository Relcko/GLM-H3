import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioHolding, InvestmentAggregation } from "../types";
import { PortfolioAssetType } from "../types";

export class InvestmentAggregator {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly logger?: Logger,
  ) {}

  aggregate(investorId: EntityId): InvestmentAggregation {
    const holdings = this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Investment);
    const totalInvested = holdings.reduce((s, h) => s + h.costBasis.amount, 0n);
    const currentValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const totalReturn = currentValue - totalInvested;
    const currency: Currency = holdings.length > 0 ? holdings[0].costBasis.currency : Currency.USDT;

    const result: InvestmentAggregation = {
      totalInvested: { amount: totalInvested, currency },
      currentValue: { amount: currentValue, currency },
      totalReturn,
      holdings,
      count: holdings.length,
    };

    this.logger?.info("investment aggregation computed", { investorId, count: holdings.length });
    return result;
  }

  listHoldings(investorId: EntityId): readonly PortfolioHolding[] {
    return this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Investment);
  }

  getInvestmentCount(investorId: EntityId): number {
    return this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Investment).length;
  }
}
