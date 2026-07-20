import { describe, it, expect, beforeEach } from "vitest";
import { createProperty, AssetType, PropertyStatus } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { EligibilityEngine } from "../eligibility/engine";
import { EligibilityError } from "../errors";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

function makeProperty(overrides: Record<string, unknown> = {}) {
  const prop = createProperty({
    slug: "test-property",
    name: "Test Property",
    description: "A test property",
    location: "Test Location",
    assetType: AssetType.Residential,
    totalValue: 1_000_000,
    tokenPrice: 10,
    totalTokens: 100_000n,
    currency: Currency.USDT,
    expectedRoi: 8,
    rentalYield: 5,
    appreciationRate: 3,
    minInvestment: 100,
    blockchain: "97",
    contractAddress: addr("0x1234567890abcdef1234567890abcdef12345678"),
    tokenId: "1",
    ...(overrides as any),
  });
  return { ...prop, status: overrides.status ?? prop.status } as any;
}

describe("EligibilityEngine", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let engine: EligibilityEngine;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    engine = new EligibilityEngine(repo, bus);
  });

  it("passes eligibility for valid request on active property", () => {
    const property = makeProperty({ status: PropertyStatus.Active });
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("fails for non-active property", () => {
    const property = makeProperty({ status: PropertyStatus.Draft });
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("property is not active for investment");
  });

  it("fails for zero tokens", () => {
    const property = makeProperty({ status: PropertyStatus.Active });
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 0n,
      amount: 0n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("tokens must be positive");
  });

  it("fails when tokens exceed available supply", () => {
    const base = makeProperty({ status: PropertyStatus.Active });
    const property = { ...base, availableTokens: 5n };
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 10n,
      amount: base.tokenPrice.amount * 10n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("requested tokens exceed available supply");
  });

  it("fails when amount does not match tokens * price", () => {
    const property = makeProperty({ status: PropertyStatus.Active });
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 10n,
      amount: 1n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("amount must equal tokens * token price");
  });

  it("fails when amount is below minimum", () => {
    const property = makeProperty({ status: PropertyStatus.Active });
    const result = engine.check({
      property: property as any,
      investorId: eid("investor_1"),
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n - 1n,
      chainId: 97,
      existingInvestments: [],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("amount is below the minimum investment");
  });

  it("throws on assertAndPublish when ineligible", async () => {
    const property = makeProperty({ status: PropertyStatus.Draft });
    const request = {
      investorId: eid("investor_1"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: 100n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0x1234"),
      idempotencyKey: "key-1",
    };

    await expect(engine.assertAndPublish(eid("actor_1"), request, property as any)).rejects.toThrow(EligibilityError);
  });

  it("publishes eligibility passed event on success", async () => {
    const property = makeProperty({ status: PropertyStatus.Active });
    const request = {
      investorId: eid("investor_1"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0x1234"),
      idempotencyKey: "key-1",
    };

    await engine.assertAndPublish(eid("actor_1"), request, property as any);
    expect(bus.publishedOfType("investment.eligibility_passed").length).toBe(1);
  });
});
