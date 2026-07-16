import { describe, expect, it } from "vitest";
import { matchesFilters, getFilterOptions } from "./filtering";
import { EMPTY_FILTERS } from "@/marketplace/hooks/useMarketplaceFilters";
import type { MarketplaceProperty } from "@/marketplace/types";

function make(partial: Partial<MarketplaceProperty>): MarketplaceProperty {
  return {
    id: "p",
    slug: "p",
    name: "Property",
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

describe("matchesFilters", () => {
  it("returns true when no filters active", () => {
    expect(matchesFilters(make({}), EMPTY_FILTERS)).toBe(true);
  });

  it("filters by country", () => {
    const f = { ...EMPTY_FILTERS, countries: ["UAE"] };
    expect(matchesFilters(make({ country: "UAE" }), f)).toBe(true);
    expect(matchesFilters(make({ country: "UK" }), f)).toBe(false);
  });

  it("filters by asset type and status", () => {
    const f = { ...EMPTY_FILTERS, assetTypes: ["commercial" as const], statuses: ["active" as const] };
    expect(matchesFilters(make({ assetType: "commercial", status: "active" }), f)).toBe(true);
    expect(matchesFilters(make({ assetType: "residential", status: "active" }), f)).toBe(false);
  });

  it("filters by ROI range", () => {
    const f = { ...EMPTY_FILTERS, roi: { min: 8, max: 12 } };
    expect(matchesFilters(make({ expectedRoi: 10 }), f)).toBe(true);
    expect(matchesFilters(make({ expectedRoi: 5 }), f)).toBe(false);
  });

  it("filters by funding range (0..100)", () => {
    const f = { ...EMPTY_FILTERS, funding: { min: 40, max: 60 } };
    expect(matchesFilters(make({ fundingProgress: 0.5 }), f)).toBe(true);
    expect(matchesFilters(make({ fundingProgress: 0.8 }), f)).toBe(false);
  });
});

describe("getFilterOptions", () => {
  it("derives unique options and numeric ranges", () => {
    const opts = getFilterOptions([
      make({ country: "UAE", expectedRoi: 10, tokenPrice: 50, fundingProgress: 0.5 }),
      make({ country: "UK", expectedRoi: 20, tokenPrice: 100, fundingProgress: 0.9 }),
    ]);
    expect(opts.countries).toEqual(["UAE", "UK"]);
    expect(opts.roiRange).toEqual([10, 20]);
    expect(opts.priceRange).toEqual([50, 100]);
    expect(opts.fundingRange).toEqual([50, 90]);
  });
});
