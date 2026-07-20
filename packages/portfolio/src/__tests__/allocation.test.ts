import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { AllocationEngine } from "../allocation/service";
import { CashflowProjectionEngine } from "../cashflow/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("AllocationEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let allocationEngine: AllocationEngine;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    allocationEngine = new AllocationEngine(repository, events);
  });

  it("computes asset allocation", () => {
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
    repository.saveHolding(h1);
    repository.saveHolding(h2);

    const result = allocationEngine.computeAllocation(actorId, investorId);
    expect(result.assetAllocation.length).toBeGreaterThan(0);
    expect(result.assetAllocation[0].category).toBeDefined();
    expect(result.assetAllocation[0].percentage).toBeGreaterThan(0);
  });

  it("diversification score", () => {
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
    repository.saveHolding(h1);
    repository.saveHolding(h2);
    repository.saveHolding(h3);

    const result = allocationEngine.computeAllocation(actorId, investorId);
    expect(result.diversificationScore).toBeGreaterThan(0);
  });
});

describe("CashflowProjectionEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let cashflowEngine: CashflowProjectionEngine;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    cashflowEngine = new CashflowProjectionEngine(repository, events);
  });

  it("projects cashflow", () => {
    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 100000n, currency: Currency.USDC },
      currentValue: { amount: 120000n, currency: Currency.USDC },
      profitLoss: 20000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);

    const projection = cashflowEngine.projectCashflow(actorId, investorId, 12);
    expect(projection.entries.length).toBe(12);
    expect(projection.entries[0].month).toBeDefined();
  });

  it("total projected is calculated", () => {
    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 100000n, currency: Currency.USDC },
      currentValue: { amount: 120000n, currency: Currency.USDC },
      profitLoss: 20000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);

    const projection = cashflowEngine.projectCashflow(actorId, investorId, 12);
    expect(projection.totalProjected.amount).toBeGreaterThan(0n);
  });
});
