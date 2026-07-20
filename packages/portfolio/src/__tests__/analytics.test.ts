import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioAnalytics } from "../analytics/service";
import { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("PortfolioAnalytics", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let analytics: PortfolioAnalytics;
  let portfolioService: PortfolioService;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    analytics = new PortfolioAnalytics(repository, events);
    portfolioService = new PortfolioService(repository, events);
    portfolioService.create(actorId, investorId);

    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);
  });

  it("computes analytics", () => {
    const entry = analytics.computeAnalytics(actorId, investorId);
    expect(entry.totalValue.amount).toBeGreaterThan(0n);
    expect(entry.roi).toBeDefined();
    expect(entry.diversificationScore).toBeDefined();
    expect(entry.riskScore).toBeDefined();
  });

  it("gets latest analytics", () => {
    const computed = analytics.computeAnalytics(actorId, investorId);
    const latest = analytics.getAnalytics(investorId);
    expect(latest).toBeDefined();
    expect(latest!.investorId).toBe(computed.investorId);
    expect(latest!.totalValue.amount).toBe(computed.totalValue.amount);
  });
});
