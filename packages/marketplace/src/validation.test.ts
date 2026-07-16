import { describe, it, expect } from "vitest";
import { ValidationError } from "@relcko/error";
import { validateCreateProperty, validateReserveInvestment } from "./validation";

describe("Request validation", () => {
  it("rejects an invalid create-property payload", () => {
    expect(() => validateCreateProperty({ slug: "", name: "x" })).toThrow(ValidationError);
  });

  it("accepts a valid reserve payload", () => {
    const v = validateReserveInvestment({ propertyId: "prop_1", tokens: 10n, amount: 100, currency: "USDT" });
    expect(v.tokens).toBe(10n);
    expect(v.currency).toBe("USDT");
  });

  it("rejects negative tokens", () => {
    expect(() => validateReserveInvestment({ propertyId: "p", tokens: -1n, amount: 1, currency: "USDT" })).toThrow(
      ValidationError,
    );
  });

  it("rejects an unknown asset type", () => {
    expect(() =>
      validateCreateProperty({
        slug: "x",
        name: "x",
        description: "x",
        location: "x",
        assetType: "not_a_type",
        totalValue: 1,
        tokenPrice: 1,
        totalTokens: 1n,
        currency: "USDT",
        expectedRoi: 1,
        rentalYield: 1,
        appreciationRate: 1,
        minInvestment: 1,
        blockchain: "eth",
        contractAddress: "0x0000000000000000000000000000000000000000",
        tokenId: "1",
      }),
    ).toThrow(ValidationError);
  });
});
