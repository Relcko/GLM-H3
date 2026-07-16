import { describe, expect, it } from "vitest";
import { Currency, type Address } from "@relcko/types";
import { createProperty } from "@relcko/domain-core";
import { parseProperty, parseInvestor, ValidationError } from "@relcko/validation";
import { createEnvelope, validateEnvelope } from "@relcko/events";

const ADDR = "0x0000000000000000000000000000000000000001" as Address;

describe("validation schemas", () => {
  it("round-trips a domain property through zod", () => {
    const p = createProperty({
      slug: "v", name: "v", description: "d", location: "EU",
      assetType: "land" as never, totalValue: 100, tokenPrice: 1, totalTokens: 10n,
      currency: Currency.USDT, expectedRoi: 1, rentalYield: 1, appreciationRate: 1,
      minInvestment: 1, blockchain: "bsc", contractAddress: ADDR, tokenId: "1",
    });
    const parsed = parseProperty(p);
    expect(parsed.id).toBe(p.id);
    expect(parsed.totalTokens).toBe(10n);
  });

  it("rejects an invalid property (bad email-like field on investor)", () => {
    expect(() =>
      parseInvestor({
        id: "inv_1", name: "x", email: "not-an-email", walletAddress: ADDR,
        status: "registered", isAdmin: false, kycStatus: "submitted", createdAt: new Date().toISOString(),
      }),
    ).toThrow(ValidationError);
  });

  it("validates event envelopes", () => {
    const env = createEnvelope({ type: "Ping", aggregateId: "a" as never, actorId: "b" as never, payload: { ok: 1 } });
    expect(() => validateEnvelope(env)).not.toThrow();
    expect(() => validateEnvelope({ type: 123 } as never)).toThrow(ValidationError);
  });
});
