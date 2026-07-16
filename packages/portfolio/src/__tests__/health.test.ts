import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioHealthEngine } from "../health/service";
import { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("PortfolioHealthEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let healthEngine: PortfolioHealthEngine;
  let portfolioService: PortfolioService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    healthEngine = new PortfolioHealthEngine(repository);
    portfolioService = new PortfolioService(repository, events);
    portfolioService.create(actorId, investorId);
  });

  it("checks health", () => {
    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);

    const health = healthEngine.checkHealth(actorId, investorId);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it("diversification score is 0 with single holding", () => {
    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);

    const health = healthEngine.checkHealth(actorId, investorId);
    expect(health.diversificationScore).toBeLessThan(50);
  });

  it("diversification score increases with more holdings", () => {
    const h1: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    const h2: PortfolioHolding = {
      id: "h2" as never, investorId, assetType: PortfolioAssetType.Nft,
      assetId: "a2" as never, name: "Digital Art", quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDC },
      currentValue: { amount: 6000n, currency: Currency.USDC },
      profitLoss: 1000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    const h3: PortfolioHolding = {
      id: "h3" as never, investorId, assetType: PortfolioAssetType.Fraction,
      assetId: "a3" as never, name: "Fractional REIT", quantity: 1n,
      costBasis: { amount: 3000n, currency: Currency.USDC },
      currentValue: { amount: 3500n, currency: Currency.USDC },
      profitLoss: 500n, returnPercentage: 16.67, acquiredAt: "2026-01-01",
    };
    const h4: PortfolioHolding = {
      id: "h4" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a4" as never, name: "London Office", quantity: 1n,
      costBasis: { amount: 20000n, currency: Currency.USDC },
      currentValue: { amount: 22000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 10, acquiredAt: "2026-01-01",
    };
    const h5: PortfolioHolding = {
      id: "h5" as never, investorId, assetType: PortfolioAssetType.Nft,
      assetId: "a5" as never, name: "Crypto Punk", quantity: 1n,
      costBasis: { amount: 8000n, currency: Currency.USDC },
      currentValue: { amount: 10000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 25, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h1);
    repository.saveHolding(h2);
    repository.saveHolding(h3);
    repository.saveHolding(h4);
    repository.saveHolding(h5);

    const health = healthEngine.checkHealth(actorId, investorId);
    expect(health.diversificationScore).toBeGreaterThan(30);
  });
});
