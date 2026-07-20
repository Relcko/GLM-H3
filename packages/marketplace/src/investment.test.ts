import { describe, it, expect } from "vitest";
import { InvestmentStatus } from "@relcko/domain-core";
import { Currency } from "@relcko/types";
import { INVESTOR, createActiveProperty, eid, makeMarketplace } from "./test-helpers";

describe("InvestmentService", () => {
  it("reserves, confirms, settles; updates supply and creates ownership", async () => {
    const { mp, repository } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const tokens = 100n;
    const amount = Number(tokens) * 100; // tokenPrice 100 major
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens, amount, currency: Currency.USDT });
    expect(inv.status).toBe(InvestmentStatus.Pending);

    const confirmed = await mp.investments.confirm(INVESTOR(), inv.id);
    expect(confirmed.status).toBe(InvestmentStatus.Processing);

    const settled = await mp.investments.settle(INVESTOR(), inv.id);
    expect(settled.status).toBe(InvestmentStatus.Confirmed);

    expect(mp.properties.get(p.id).availableTokens).toBe(9_900n);
    const ownership = repository.getOwnership(eid("acc_investor"), p.id);
    expect(ownership?.quantity).toBe(100n);
    expect(mp.investments.listByInvestor(eid("acc_investor")).length).toBe(1);
  });

  it("blocks settling before confirmation (invalid state transition)", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 10n, amount: 1000, currency: Currency.USDT });
    await expect(mp.investments.settle(INVESTOR(), inv.id)).rejects.toThrow();
  });

  it("cancels a pending reservation", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 50n, amount: 5000, currency: Currency.USDT });
    const cancelled = await mp.investments.cancel(INVESTOR(), inv.id);
    expect(cancelled.status).toBe(InvestmentStatus.Failed);
    expect(mp.properties.get(p.id).availableTokens).toBe(10_000n);
  });

  it("refunds a failed investment", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 50n, amount: 5000, currency: Currency.USDT });
    await mp.investments.fail(INVESTOR(), inv.id);
    const refunded = await mp.investments.refund(INVESTOR(), inv.id);
    expect(refunded.status).toBe(InvestmentStatus.Refunded);
  });
});
