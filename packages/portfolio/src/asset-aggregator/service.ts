import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioHolding, PortfolioAssetType } from "../types";

export class AssetAggregator {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly logger?: Logger,
  ) {}

  aggregateAll(investorId: EntityId): readonly PortfolioHolding[] {
    const holdings = this.repository.listHoldingsByInvestor(investorId);
    this.logger?.debug("aggregated all holdings", { investorId, count: holdings.length });
    return holdings;
  }

  aggregateByType(investorId: EntityId, assetType: PortfolioAssetType): readonly PortfolioHolding[] {
    const holdings = this.repository.listHoldingsByAsset(investorId, assetType);
    this.logger?.debug("aggregated holdings by type", { investorId, assetType, count: holdings.length });
    return holdings;
  }

  getTotalValue(investorId: EntityId): bigint {
    const holdings = this.repository.listHoldingsByInvestor(investorId);
    return holdings.reduce((sum, h) => sum + h.currentValue.amount, 0n);
  }

  getCostBasis(investorId: EntityId): bigint {
    const holdings = this.repository.listHoldingsByInvestor(investorId);
    return holdings.reduce((sum, h) => sum + h.costBasis.amount, 0n);
  }

  getTotalReturn(investorId: EntityId): bigint {
    return this.getTotalValue(investorId) - this.getCostBasis(investorId);
  }
}
