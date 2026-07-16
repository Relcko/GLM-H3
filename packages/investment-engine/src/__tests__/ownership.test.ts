import { describe, it, expect, beforeEach } from "vitest";
import { createInvestment } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { OwnershipAllocator } from "../ownership/allocator";
import { Currency } from "@relcko/types";

describe("OwnershipAllocator", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let allocator: OwnershipAllocator;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    allocator = new OwnershipAllocator(repo, bus);
  });

  it("creates new ownership on first investment", async () => {
    const investment = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const ownership = await allocator.allocate("actor_1" as any, investment);
    expect(ownership).toBeDefined();
    expect(ownership.investorId).toBe("investor_1");
    expect(ownership.propertyId).toBe("prop_1");
    expect(ownership.quantity).toBe(100n);
    expect(bus.publishedOfType("investment.ownership_allocated").length).toBe(1);
  });

  it("increases existing ownership on subsequent investment", async () => {
    const first = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    await allocator.allocate("actor_1" as any, first);

    const second = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 50n,
      amount: 500,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const ownership = await allocator.allocate("actor_1" as any, second);
    expect(ownership.quantity).toBe(150n);
    expect(bus.publishedOfType("investment.ownership_allocated").length).toBe(2);
  });

  it("creates ownership snapshot on allocation", async () => {
    const investment = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    await allocator.allocate("actor_1" as any, investment);
    const snapshots = repo.listOwnershipSnapshots("investor_1" as any, "prop_1" as any);
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].quantity).toBe(100n);
  });

  it("lists ownerships by investor", async () => {
    const inv1 = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const inv2 = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_2" as any,
      fractionId: "frac_2" as any,
      tokens: 50n,
      amount: 500,
      currency: Currency.USDT,
      kycVerified: true,
    });

    await allocator.allocate("actor_1" as any, inv1);
    await allocator.allocate("actor_1" as any, inv2);

    const ownerships = allocator.listOwnerships("investor_1" as any);
    expect(ownerships.length).toBe(2);
  });

  it("publishes events before returning (authoritative publication)", async () => {
    const investment = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    await allocator.allocate("actor_1" as any, investment);
    expect(bus.publishedOfType("investment.ownership_allocated").length).toBe(1);
    expect(bus.publishedOfType("investment.ownership_snapshot_generated").length).toBe(1);
  });

  it("maintains ownership in bigint — no floating point in avg cost basis", async () => {
    // Use a large bigint value that would lose precision if converted via Number()
    const investment = createInvestment({
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      fractionId: "frac_1" as any,
      tokens: 100_000n,
      amount: 9_007_199_254_740_991, // near Number.MAX_SAFE_INTEGER
      currency: Currency.USDT,
      kycVerified: true,
    });

    const ownership = await allocator.allocate("actor_1" as any, investment);
    expect(typeof ownership.avgCostBasis.amount).toBe("bigint");
    expect(ownership.quantity).toBe(100_000n);
  });
});
