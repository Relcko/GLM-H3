import { describe, expect, it } from "vitest";
import {
  amountForFractions,
  checkEligibility,
  clampAmount,
  expectedAnnualReturn,
  expectedAnnualTotal,
  expectedYield,
  fractionsForAmount,
  fundingRemaining,
} from "./investment";
import type { MarketplaceProperty } from "@/marketplace/types";

function make(partial: Partial<MarketplaceProperty>): MarketplaceProperty {
  return {
    id: "p",
    slug: "p",
    name: "P",
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

describe("investment calculator", () => {
  it("computes fractions for amount", () => {
    expect(fractionsForAmount(250, 50)).toBe(5);
    expect(fractionsForAmount(249, 50)).toBe(4);
    expect(fractionsForAmount(0, 50)).toBe(0);
  });

  it("computes amount for fractions", () => {
    expect(amountForFractions(5, 50)).toBe(250);
  });

  it("computes expected returns", () => {
    expect(expectedAnnualReturn(1000, 10)).toBe(100);
    expect(expectedYield(1000, 6)).toBe(60);
    expect(expectedAnnualTotal(1000, 10, 6)).toBe(160);
  });

  it("computes funding remaining", () => {
    expect(fundingRemaining(make({ availableTokens: 50, tokenPrice: 50 }))).toBe(2500);
  });

  it("clamps amount to [min, remaining]", () => {
    const p = make({ minInvestment: 50, availableTokens: 10, tokenPrice: 50 });
    expect(clampAmount(10, p)).toBe(50);
    expect(clampAmount(10000, p)).toBe(500);
  });

  it("gatekeeps eligibility", () => {
    const p = make({});
    expect(checkEligibility(50, p).eligible).toBe(true);
    expect(checkEligibility(49, p).eligible).toBe(false);
    expect(checkEligibility(0, p).eligible).toBe(false);
    expect(checkEligibility(50, make({ status: "sold_out" })).eligible).toBe(false);
    expect(checkEligibility(50, make({ status: "upcoming" })).eligible).toBe(false);
  });
});
