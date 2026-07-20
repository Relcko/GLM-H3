import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioService } from "../portfolio/service";
import { AssetAggregator } from "../asset-aggregator/service";
import { InvestmentAggregator } from "../investment-aggregator/service";
import { NftAggregator } from "../nft-aggregator/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("AssetAggregator", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let portfolioService: PortfolioService;
  let assetAggregator: AssetAggregator;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    portfolioService = new PortfolioService(repository, events);
    assetAggregator = new AssetAggregator(repository);
    portfolioService.create(actorId, investorId);
  });

  it("aggregates all holdings", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 6000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-2" as never,
      name: "Investment B",
      quantity: 1n,
      costBasis: { amount: 3000n, currency: Currency.USDT },
      currentValue: { amount: 4000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const holdings = assetAggregator.aggregateAll(investorId);
    expect(holdings.length).toBe(3);
  });

  it("aggregates by type", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 6000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const investments = assetAggregator.aggregateByType(investorId, PortfolioAssetType.Investment);
    expect(investments.length).toBe(1);
    expect(investments[0].assetType).toBe(PortfolioAssetType.Investment);
  });

  it("computes total value", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 1000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-2" as never,
      name: "Investment B",
      quantity: 1n,
      costBasis: { amount: 3000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const totalValue = assetAggregator.getTotalValue(investorId);
    expect(totalValue).toBe(3000n);
  });

  it("computes cost basis", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-2" as never,
      name: "Investment B",
      quantity: 1n,
      costBasis: { amount: 2000n, currency: Currency.USDT },
      currentValue: { amount: 3000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const costBasis = assetAggregator.getCostBasis(investorId);
    expect(costBasis).toBe(3000n);
  });

  it("computes total return", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 3000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const totalReturn = assetAggregator.getTotalReturn(investorId);
    expect(totalReturn).toBe(2000n);
  });
});

describe("InvestmentAggregator", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let portfolioService: PortfolioService;
  let investmentAggregator: InvestmentAggregator;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    portfolioService = new PortfolioService(repository, events);
    investmentAggregator = new InvestmentAggregator(repository);
    portfolioService.create(actorId, investorId);
  });

  it("aggregates investments", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "inv-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 7000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const aggregation = investmentAggregator.aggregate(investorId);
    expect(aggregation.totalInvested.amount).toBe(5000n);
    expect(aggregation.currentValue.amount).toBe(7000n);
    expect(aggregation.totalReturn).toBe(2000n);
    expect(aggregation.count).toBe(1);
  });

  it("lists investment holdings only", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "inv-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 6000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const holdings = investmentAggregator.listHoldings(investorId);
    expect(holdings.length).toBe(1);
    expect(holdings[0].assetType).toBe(PortfolioAssetType.Investment);
  });

  it("counts investments", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "inv-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 6000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "inv-2" as never,
      name: "Investment B",
      quantity: 1n,
      costBasis: { amount: 3000n, currency: Currency.USDT },
      currentValue: { amount: 4000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const count = investmentAggregator.getInvestmentCount(investorId);
    expect(count).toBe(2);
  });
});

describe("NftAggregator", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let portfolioService: PortfolioService;
  let nftAggregator: NftAggregator;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    portfolioService = new PortfolioService(repository, events);
    nftAggregator = new NftAggregator(repository);
    portfolioService.create(actorId, investorId);
  });

  it("aggregates NFTs", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-coll-1" as never,
      name: "NFT A",
      quantity: 2n,
      costBasis: { amount: 2000n, currency: Currency.USDT },
      currentValue: { amount: 4000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const aggregation = nftAggregator.aggregate(investorId);
    expect(aggregation.totalNfts).toBe(2);
    expect(aggregation.nftValue.amount).toBe(4000n);
  });

  it("lists NFT holdings only", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-coll-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "inv-1" as never,
      name: "Investment A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 6000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const holdings = nftAggregator.listNftHoldings(investorId);
    expect(holdings.length).toBe(1);
    expect(holdings[0].assetType).toBe(PortfolioAssetType.Nft);
  });

  it("counts NFTs", () => {
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-coll-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 1000n, currency: Currency.USDT },
      currentValue: { amount: 2000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });
    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-coll-2" as never,
      name: "NFT B",
      quantity: 1n,
      costBasis: { amount: 3000n, currency: Currency.USDT },
      currentValue: { amount: 4000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const count = nftAggregator.getNftCount(investorId);
    expect(count).toBe(2);
  });
});
