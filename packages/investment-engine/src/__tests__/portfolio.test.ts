import { describe, it, expect, beforeEach } from "vitest";
import { createOwnership } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { PortfolioAdapter } from "../portfolio/adapter";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;

describe("PortfolioAdapter", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let adapter: PortfolioAdapter;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    adapter = new PortfolioAdapter(repo, bus);
  });

  it("builds portfolio snapshot from ownerships", async () => {
    const ownership = createOwnership({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      quantity: 100n,
      avgCostBasis: 10,
      currentPrice: 12,
      currency: Currency.USDT,
      totalSupply: 1000n,
    });

    repo.saveOwnership(ownership);

    await adapter.updatePortfolio(eid("investor_1"));
    const snapshot = adapter.getPortfolio(eid("investor_1"));

    expect(snapshot).toBeDefined();
    expect(snapshot!.investorId).toBe("investor_1");
    expect(snapshot!.holdings.length).toBe(1);
    expect(snapshot!.holdings[0].quantity).toBe(100n);
  });

  it("does nothing for investor with no ownerships", async () => {
    await adapter.updatePortfolio(eid("empty_investor"));
    const snapshot = adapter.getPortfolio(eid("empty_investor"));
    expect(snapshot).toBeUndefined();
  });

  it("publishes portfolio update event", async () => {
    const ownership = createOwnership({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      quantity: 100n,
      avgCostBasis: 10,
      currentPrice: 12,
      currency: Currency.USDT,
      totalSupply: 1000n,
    });
    repo.saveOwnership(ownership);

    await adapter.updatePortfolio(eid("investor_1"));
    expect(bus.publishedOfType("investment.portfolio_updated").length).toBe(1);
  });

  it("handles multiple ownerships in portfolio", async () => {
    const own1 = createOwnership({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      quantity: 100n,
      avgCostBasis: 10,
      currentPrice: 12,
      currency: Currency.USDT,
      totalSupply: 1000n,
    });
    const own2 = createOwnership({
      investorId: eid("investor_1"),
      propertyId: eid("prop_2"),
      fractionId: eid("frac_2"),
      quantity: 50n,
      avgCostBasis: 20,
      currentPrice: 25,
      currency: Currency.USDT,
      totalSupply: 500n,
    });

    repo.saveOwnership(own1);
    repo.saveOwnership(own2);

    await adapter.updatePortfolio(eid("investor_1"));
    const snapshot = adapter.getPortfolio(eid("investor_1"));
    expect(snapshot!.holdings.length).toBe(2);
  });
});
