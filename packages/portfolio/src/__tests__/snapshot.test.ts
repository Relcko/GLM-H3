import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioService } from "../portfolio/service";
import { PortfolioSnapshotEngine } from "../snapshot/service";
import { PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";

describe("PortfolioSnapshotEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let portfolioService: PortfolioService;
  let snapshotEngine: PortfolioSnapshotEngine;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    portfolioService = new PortfolioService(repository, events);
    snapshotEngine = new PortfolioSnapshotEngine(repository, events);

    portfolioService.create(actorId, investorId);
  });

  it("creates a snapshot", () => {
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

    const snapshot = snapshotEngine.createSnapshot(actorId, investorId, "2026-07");

    expect(snapshot.period).toBe("2026-07");
    expect(snapshot.assetCount).toBe(2);
    expect(snapshot.nftCount).toBe(1);
  });

  it("lists snapshots by investor", () => {
    snapshotEngine.createSnapshot(actorId, investorId, "2026-07");
    snapshotEngine.createSnapshot(actorId, investorId, "2026-08");

    const snapshots = snapshotEngine.listSnapshots(investorId);
    expect(snapshots.length).toBe(2);
  });

  it("lists snapshots by period", () => {
    snapshotEngine.createSnapshot(actorId, investorId, "2026-07");
    snapshotEngine.createSnapshot(actorId, investorId, "2026-08");

    const filtered = snapshotEngine.listSnapshotsByPeriod(investorId, "2026-07");
    expect(filtered.length).toBe(1);
    expect(filtered[0].period).toBe("2026-07");
  });

  it("compares two snapshots", () => {
    const s1 = snapshotEngine.createSnapshot(actorId, investorId, "2026-07");

    portfolioService.addHolding(actorId, investorId, {
      assetType: PortfolioAssetType.Investment,
      assetId: "asset-1" as never,
      name: "Property A",
      quantity: 1n,
      costBasis: { amount: 100000n, currency: Currency.USDT },
      currentValue: { amount: 120000n, currency: Currency.USDT },
      acquiredAt: new Date().toISOString(),
    });

    const s2 = snapshotEngine.createSnapshot(actorId, investorId, "2026-08");

    const comparison = snapshotEngine.compareSnapshots(s1.id, s2.id);

    expect(comparison.period1).toBe("2026-07");
    expect(comparison.period2).toBe("2026-08");
    expect(comparison.assetCountChange).toBe(1);
  });
});
