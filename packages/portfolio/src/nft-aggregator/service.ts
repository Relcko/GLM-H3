import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioHolding, NftAggregation } from "../types";
import { PortfolioAssetType } from "../types";

export class NftAggregator {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly logger?: Logger,
  ) {}

  aggregate(investorId: EntityId): NftAggregation {
    const entries = this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Nft);
    const totalNfts = entries.reduce((s, h) => s + Number(h.quantity), 0);
    const totalCollections = new Set(entries.map(h => h.assetId)).size;
    const nftValue = entries.reduce((s, h) => s + h.currentValue.amount, 0n);
    const currency: Currency = entries.length > 0 ? entries[0].currentValue.currency : Currency.USDT;

    const result: NftAggregation = {
      totalNfts,
      totalCollections,
      nftValue: { amount: nftValue, currency },
      entries,
    };

    this.logger?.info("nft aggregation computed", { investorId, totalNfts, totalCollections });
    return result;
  }

  listNftHoldings(investorId: EntityId): readonly PortfolioHolding[] {
    return this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Nft);
  }

  getNftCount(investorId: EntityId): number {
    return this.repository.listHoldingsByAsset(investorId, PortfolioAssetType.Nft).length;
  }
}
