import type { EntityId, Money, Currency } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftAnalyticsEntry } from "../types";

export class AnalyticsService {
  constructor(
    private readonly repository: NftRepository,
    private readonly logger?: Logger,
  ) {}

  recordSale(nftId: EntityId, collectionId: EntityId, saleAmount: Money): void {
    const existing = this.repository.getAnalytics(nftId);
    const prevVolume = existing?.totalVolume ?? { amount: 0n, currency: saleAmount.currency as Currency };

    const entry: NftAnalyticsEntry = {
      nftId,
      collectionId,
      totalVolume: { amount: prevVolume.amount + saleAmount.amount, currency: saleAmount.currency },
      totalSales: (existing?.totalSales ?? 0) + 1,
      floorPrice: existing?.floorPrice,
      averagePrice: existing?.averagePrice,
      highestSale: this.maxMoney(existing?.highestSale, saleAmount),
      holderCount: existing?.holderCount ?? 0,
      transferCount: existing?.transferCount ?? 0,
      listingCount: existing?.listingCount ?? 0,
      trendingScore: (existing?.trendingScore ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);
  }

  recordTransfer(nftId: EntityId, collectionId: EntityId): void {
    const existing = this.repository.getAnalytics(nftId);
    const entry: NftAnalyticsEntry = {
      nftId,
      collectionId,
      totalVolume: existing?.totalVolume ?? { amount: 0n, currency: "USDT" as Currency },
      totalSales: existing?.totalSales ?? 0,
      floorPrice: existing?.floorPrice,
      averagePrice: existing?.averagePrice,
      highestSale: existing?.highestSale,
      holderCount: existing?.holderCount ?? 0,
      transferCount: (existing?.transferCount ?? 0) + 1,
      listingCount: existing?.listingCount ?? 0,
      trendingScore: existing?.trendingScore ?? 0,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);
  }

  recordListing(nftId: EntityId, collectionId: EntityId): void {
    const existing = this.repository.getAnalytics(nftId);
    const entry: NftAnalyticsEntry = {
      nftId,
      collectionId,
      totalVolume: existing?.totalVolume ?? { amount: 0n, currency: "USDT" as Currency },
      totalSales: existing?.totalSales ?? 0,
      floorPrice: existing?.floorPrice,
      averagePrice: existing?.averagePrice,
      highestSale: existing?.highestSale,
      holderCount: existing?.holderCount ?? 0,
      transferCount: existing?.transferCount ?? 0,
      listingCount: (existing?.listingCount ?? 0) + 1,
      trendingScore: existing?.trendingScore ?? 0,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);
  }

  get(nftId: EntityId): NftAnalyticsEntry | undefined {
    return this.repository.getAnalytics(nftId);
  }

  private maxMoney(a?: Money, b?: Money): Money | undefined {
    if (!a) return b;
    if (!b) return a;
    return a.amount > b.amount ? a : b;
  }
}
