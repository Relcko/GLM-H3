import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioSearch } from "../search/service";
import { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("PortfolioSearch", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let search: PortfolioSearch;
  let portfolioService: PortfolioService;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    search = new PortfolioSearch(repository, events);
    portfolioService = new PortfolioService(repository, events);
    portfolioService.create(actorId, investorId);

    const h1: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-06-01",
    };
    const h2: PortfolioHolding = {
      id: "h2" as never, investorId, assetType: PortfolioAssetType.Nft,
      assetId: "a2" as never, name: "Digital Art", quantity: 1n,
      costBasis: { amount: 5000n, currency: Currency.USDC },
      currentValue: { amount: 6000n, currency: Currency.USDC },
      profitLoss: 1000n, returnPercentage: 20, acquiredAt: "2026-07-01",
    };
    repository.saveHolding(h1);
    repository.saveHolding(h2);
  });

  it("searches by keyword", () => {
    const result = search.search(investorId, { query: "Property" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some(i => i.title.includes("Property"))).toBe(true);
  });

  it("searches by date range", () => {
    const result = search.search(investorId, {
      dateFrom: "2026-06-01", dateTo: "2026-06-30",
    });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("searches by amount", () => {
    const result = search.search(investorId, { minAmount: 10000n });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every(i => (i.amount?.amount ?? 0n) >= 10000n)).toBe(true);
  });
});
