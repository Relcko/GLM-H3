import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";
import type { MarketplaceProperty } from "@/marketplace/types";

function make(partial: Partial<MarketplaceProperty>): MarketplaceProperty {
  return {
    id: "p",
    slug: "azure-harbour-residences",
    name: "Azure Harbour Residences",
    description: "Waterfront residential tower",
    country: "UAE",
    city: "Dubai",
    address: "Marina Promenade",
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

describe("matchesQuery", () => {
  it("matches empty query", () => {
    expect(matchesQuery(make({}), "")).toBe(true);
  });

  it("matches across name, city, country", () => {
    expect(matchesQuery(make({}), "dubai")).toBe(true);
    expect(matchesQuery(make({}), "UAE")).toBe(true);
    expect(matchesQuery(make({}), "harbour")).toBe(true);
  });

  it("matches asset type and status keywords", () => {
    expect(matchesQuery(make({}), "residential")).toBe(true);
    expect(matchesQuery(make({}), "active")).toBe(true);
  });

  it("is case-insensitive and rejects non-matches", () => {
    expect(matchesQuery(make({}), "tokyo")).toBe(false);
    expect(matchesQuery(make({}), "DUBAI")).toBe(true);
  });

  it("matches SPV legal name and jurisdiction", () => {
    const withSpv = make({
      spv: {
        id: "spv",
        property_id: "p",
        legal_name: "Relcko Azure Harbour SPV Ltd",
        jurisdiction: "UAE (DIFC)",
        registration_number: "X",
        governing_document_url: "",
        bank_account_ref: "",
        status: "active",
        formed_at: "",
        dissolved_at: null,
      },
    });
    expect(matchesQuery(withSpv, "DIFC")).toBe(true);
  });
});
