import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";

describe("PortfolioService", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let portfolioService: PortfolioService;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    portfolioService = new PortfolioService(repository, events);
  });

  it("creates a portfolio", () => {
    const portfolio = portfolioService.create(actorId, investorId);

    expect(portfolio).toBeDefined();
    expect(portfolio.investorId).toBe(investorId);
    expect(portfolio.totalInvested.amount).toBe(0n);
  });

  it("creates and retrieves portfolio by investor", () => {
    portfolioService.create(actorId, investorId);
    const retrieved = portfolioService.get(investorId);

    expect(retrieved).toBeDefined();
    expect(retrieved!.investorId).toBe(investorId);
  });

  it("updates portfolio values", () => {
    portfolioService.create(actorId, investorId);

    const updated = portfolioService.update(actorId, investorId, {
      totalInvested: { amount: 50000n, currency: Currency.USDT },
      currentValue: { amount: 75000n, currency: Currency.USDT },
      roi: 50,
    });

    expect(updated.totalInvested.amount).toBe(50000n);
    expect(updated.currentValue.amount).toBe(75000n);
    expect(updated.roi).toBe(50);
  });

  it("deletes portfolio", () => {
    portfolioService.create(actorId, investorId);

    const holding = portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Test",
      quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDT },
      currentValue: { amount: 12000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    portfolioService.delete(actorId, investorId);

    expect(portfolioService.listHoldings(investorId)).toHaveLength(0);
  });

  it("adds and lists holdings", () => {
    portfolioService.create(actorId, investorId);

    const holding = portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Test Investment",
      quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDT },
      currentValue: { amount: 12000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const holdings = portfolioService.listHoldings(investorId);
    expect(holdings.length).toBe(1);
    expect(holdings[0].assetType).toBe(PortfolioAssetType.Investment);
  });

  it("removes a holding", () => {
    portfolioService.create(actorId, investorId);

    const holding = portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-1" as never,
      name: "Test NFT",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 8000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    portfolioService.removeHolding(actorId, investorId, holding.id);
    expect(portfolioService.listHoldings(investorId)).toHaveLength(0);
  });

  it("computes summary", () => {
    portfolioService.create(actorId, investorId);

    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Property A",
      quantity: 1n,
      costBasis: { amount: 100000n, currency: Currency.USDT },
      currentValue: { amount: 120000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Nft,
      assetId: "nft-1" as never,
      name: "NFT A",
      quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDT },
      currentValue: { amount: 7000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const summary = portfolioService.computeSummary(investorId);

    expect(summary.totalPortfolioValue.amount).toBe(127000n);
    expect(summary.totalInvested.amount).toBe(105000n);
    expect(summary.roi).toBeGreaterThan(0);
  });
});
