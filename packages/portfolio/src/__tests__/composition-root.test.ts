import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { createPortfolioModule, PortfolioModule } from "../composition-root";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";

describe("PortfolioModule (composition root)", () => {
  let portModule: PortfolioModule;
  let events: EventBus;

  beforeEach(() => {
    events = new InMemoryEventBus();
    portModule = createPortfolioModule({ events });
  });

  it("exposes all 16 services", () => {
    expect(portModule.portfolioService).toBeDefined();
    expect(portModule.snapshotEngine).toBeDefined();
    expect(portModule.assetAggregator).toBeDefined();
    expect(portModule.investmentAggregator).toBeDefined();
    expect(portModule.nftAggregator).toBeDefined();
    expect(portModule.networkStatsAdapter).toBeDefined();
    expect(portModule.performanceEngine).toBeDefined();
    expect(portModule.roiEngine).toBeDefined();
    expect(portModule.allocationEngine).toBeDefined();
    expect(portModule.cashflowEngine).toBeDefined();
    expect(portModule.timeline).toBeDefined();
    expect(portModule.analytics).toBeDefined();
    expect(portModule.search).toBeDefined();
    expect(portModule.exportService).toBeDefined();
    expect(portModule.healthEngine).toBeDefined();
    expect(portModule.eventsAdapter).toBeDefined();
  });

  it("accepts a custom repository", () => {
    const customRepo = new InMemoryPortfolioRepository();
    const custom = createPortfolioModule({ events, repository: customRepo });
    expect(custom).toBeDefined();
  });

  it("completes a full end-to-end flow", () => {
    const actorId = "actor-1" as never;
    const investorId = "investor-1" as never;

    const portfolio = portModule.portfolioService.create(actorId, investorId);
    expect(portfolio.investorId).toBe(investorId);

    const holding = portModule.portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "E2E Property",
      quantity: 1n,
      costBasis: { amount: 100000n, currency: Currency.USDT },
      currentValue: { amount: 120000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    expect(holding.assetType).toBe(PortfolioAssetType.Investment);

    const snapshot = portModule.snapshotEngine.createSnapshot(actorId, investorId, "2026-07");
    expect(snapshot.assetCount).toBe(1);

    const aggregation = portModule.assetAggregator.aggregateAll(investorId);
    expect(aggregation).toHaveLength(1);

    const totalValue = portModule.assetAggregator.getTotalValue(investorId);
    expect(totalValue).toBe(120000n);
  });
});
