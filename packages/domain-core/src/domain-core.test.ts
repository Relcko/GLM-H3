import { describe, expect, it } from "vitest";
import { Currency, type Address } from "@relcko/types";
import {
  AgentStatus,
  CommissionStatus,
  computeAvgCostBasis,
  computeCommission,
  computePortfolio,
  computeRewardPayout,
  createAgent,
  createAuditLog,
  createInvestment,
  createKyc,
  createProperty,
  createPropertyFraction,
  createSale,
  createSpv,
  InvestmentStatus,
  KycStatus,
  PropertyStatus,
  transitionInvestment,
  transitionKyc,
  transitionProperty,
  applyInvestmentToSupply,
} from "@relcko/domain-core";

const ADDR = "0x0000000000000000000000000000000000000001" as Address;

describe("property domain", () => {
  it("creates a draft property and enforces invariants", () => {
    const p = createProperty({
      slug: "villa",
      name: "Villa",
      description: "d",
      location: "EU",
      assetType: "residential" as never,
      totalValue: 1_000_000,
      tokenPrice: 100,
      totalTokens: 10_000n,
      currency: Currency.USDT,
      expectedRoi: 8,
      rentalYield: 5,
      appreciationRate: 3,
      minInvestment: 100,
      blockchain: "bsc",
      contractAddress: ADDR,
      tokenId: "1",
    });
    expect(p.status).toBe(PropertyStatus.Draft);
    expect(p.availableTokens).toBe(10_000n);
  });

  it("rejects supply mismatch", () => {
    const p = createProperty({
      slug: "v", name: "v", description: "d", location: "EU",
      assetType: "land" as never, totalValue: 100, tokenPrice: 1, totalTokens: 100n,
      currency: Currency.USDT, expectedRoi: 1, rentalYield: 1, appreciationRate: 1,
      minInvestment: 1, blockchain: "bsc", contractAddress: ADDR, tokenId: "1",
    });
    expect(() => applyInvestmentToSupply(p, 200n)).toThrow();
  });

  it("transitions draft -> upcoming -> active -> sold_out and blocks invalid transitions", () => {
    let p = createProperty({
      slug: "v", name: "v", description: "d", location: "EU",
      assetType: "land" as never, totalValue: 100, tokenPrice: 1, totalTokens: 10n,
      currency: Currency.USDT, expectedRoi: 1, rentalYield: 1, appreciationRate: 1,
      minInvestment: 1, blockchain: "bsc", contractAddress: ADDR, tokenId: "1",
    });
    p = transitionProperty(p, PropertyStatus.Upcoming);
    p = transitionProperty(p, PropertyStatus.Active);
    p = applyInvestmentToSupply(p, 10n);
    expect(p.status).toBe(PropertyStatus.SoldOut);
    expect(() => transitionProperty(p, PropertyStatus.Active)).toThrow();
  });
});

describe("investment & sale", () => {
  it("creates an investment and confirms via transition", () => {
    const inv = createInvestment({
      investorId: "inv_1" as never, propertyId: "prop_1" as never, fractionId: "frac_1" as never,
      tokens: 10n, amount: 1000, currency: Currency.USDT, kycVerified: true,
    });
    expect(inv.status).toBe(InvestmentStatus.Pending);
    const processing = transitionInvestment(inv, InvestmentStatus.Processing);
    expect(transitionInvestment(processing, InvestmentStatus.Confirmed).status).toBe(InvestmentStatus.Confirmed);
  });

  it("computes sale fees: sellerReceives + platformFee === totalAmount", () => {
    const sale = createSale({
      listingId: "list_1" as never, sellerId: "inv_1" as never, buyerId: "inv_2" as never,
      propertyId: "prop_1" as never, fractionId: "frac_1" as never, quantity: 5n,
      totalAmount: 1000n, platformFeeBps: 100n, currency: Currency.USDT,
    });
    expect(sale.platformFee.amount + sale.sellerReceives.amount).toBe(sale.totalAmount.amount);
  });

  it("rejects self-trade", () => {
    expect(() => createSale({
      listingId: "l" as never, sellerId: "same" as never, buyerId: "same" as never,
      propertyId: "p" as never, fractionId: "f" as never, quantity: 1n,
      totalAmount: 100n, platformFeeBps: 0n, currency: Currency.USDT,
    })).toThrow();
  });
});

describe("identity & commission", () => {
  it("creates an agent and computes commission from authoritative rate", () => {
    const agent = createAgent({ userId: "inv_1" as never, code: "ALPHA1", commissionRate: 5, currency: Currency.USDT });
    expect(agent.status).toBe(AgentStatus.Pending);
    const commission = computeCommission(money(1000, Currency.USDT), agent.commissionRate);
    expect(commission.amount).toBe(50_000_000n);
  });

  it("transitions KYC submitted -> in_review -> approved", () => {
    const kyc = createKyc({ investorId: "inv_1" as never, documentRefs: ["doc1"] });
    expect(kyc.status).toBe(KycStatus.Submitted);
    const reviewed = transitionKyc(kyc, KycStatus.InReview);
    const approved = transitionKyc(reviewed, KycStatus.Approved);
    expect(approved.status).toBe(KycStatus.Approved);
  });
});

describe("portfolio & rewards", () => {
  it("reconciles portfolio totals", () => {
    const pf = computePortfolio("inv_1" as never, [
      { propertyId: "p1" as never, quantity: 10n, value: money(1100, Currency.USDT), profitLoss: money(100, Currency.USDT) },
    ]);
    expect(pf.totalCurrentValue.amount).toBe(1_100_000_000n);
    expect(pf.totalProfitLoss.amount).toBe(100_000_000n);
  });

  it("computes weighted-average cost basis once", () => {
    const avg = computeAvgCostBasis(money(100, Currency.USDT), 10n, money(200, Currency.USDT), 10n);
    expect(avg.amount).toBe(150_000_000n);
  });

  it("computes reward payout from per-token amount", () => {
    const schedule = {
      perTokenAmount: money(2, Currency.USDT), currency: Currency.USDT,
    } as never;
    expect(computeRewardPayout(schedule, 50n).amount).toBe(100_000_000n);
  });
});

describe("audit log", () => {
  it("requires actor/action/entity and is append-only", () => {
    const log = createAuditLog({
      actorId: "admin_1" as never, action: "role_changed", entityType: "agent",
      entityId: "agent_1" as never, before: { status: "pending" }, after: { status: "active" },
    });
    expect(log.id).toBeDefined();
    expect(() => createAuditLog({ actorId: "" as never, action: "", entityType: "agent", entityId: "x" as never })).toThrow();
  });
});

function money(amount: number, currency: Currency) {
  return { amount: BigInt(Math.round(amount * 1e6)), currency };
}
