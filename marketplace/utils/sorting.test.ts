import { describe, expect, it } from "vitest";
import { getSortComparator } from "./sorting";
import type { MarketplaceProperty } from "@/marketplace/types";

function make(partial: Partial<MarketplaceProperty>): MarketplaceProperty {
  return {
    id: "p",
    slug: "p",
    name: "B Property",
    description: "",
    country: "UAE",
    city: "Dubai",
    address: "x",
    assetType: "residential",
    status: "active",
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    totalValue: 10_000_000,
    tokenPrice: 50,
    totalTokens: 100,
    availableTokens: 50,
    soldTokens: 50,
    expectedRoi: 10,
    rentalYield: 6,
    appreciationRate: 5,
    minInvestment: 50,
    occupancy: 90,
    blockchain: "ethereum",
    contractAddress: "0x0",
    tokenId: "1",
    targetRaise: 5000,
    raisedAmount: 2500,
    fundingProgress: 0.5,
    availableFractions: 50,
    spv: null,
    hasSpv: false,
    ...partial,
  };
}

describe("getSortComparator", () => {
  it("sorts by funding desc", () => {
    const list = [make({ fundingProgress: 0.2 }), make({ fundingProgress: 0.8 })];
    list.sort(getSortComparator("funding"));
    expect(list[0].fundingProgress).toBe(0.8);
  });

  it("sorts by roi desc", () => {
    const list = [make({ expectedRoi: 5 }), make({ expectedRoi: 15 })];
    list.sort(getSortComparator("roi"));
    expect(list[0].expectedRoi).toBe(15);
  });

  it("sorts by min investment asc/desc", () => {
    const list = [make({ minInvestment: 100 }), make({ minInvestment: 20 })];
    list.sort(getSortComparator("minInvestAsc"));
    expect(list[0].minInvestment).toBe(20);
    list.sort(getSortComparator("minInvestDesc"));
    expect(list[0].minInvestment).toBe(100);
  });

  it("sorts alphabetically", () => {
    const list = [make({ name: "Zeta" }), make({ name: "Alpha" })];
    list.sort(getSortComparator("alphabetical"));
    expect(list[0].name).toBe("Alpha");
  });

  it("sorts newest by createdAt", () => {
    const list = [
      make({ createdAt: "2026-01-01T00:00:00.000Z" }),
      make({ createdAt: "2026-06-01T00:00:00.000Z" }),
    ];
    list.sort(getSortComparator("newest"));
    expect(list[0].createdAt).toBe("2026-06-01T00:00:00.000Z");
  });
});
