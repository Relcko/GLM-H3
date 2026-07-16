import { describe, it, expect } from "vitest";
import { ListingStatus, SaleStatus } from "@relcko/domain-core";
import { Currency } from "@relcko/types";
import { INVESTOR, createActiveProperty, eid, makeMarketplace } from "./test-helpers";

describe("ListingService", () => {
  it("creates a listing and settles a sale, adjusting ownership", async () => {
    const { mp, repository } = makeMarketplace();
    const p = await createActiveProperty(mp);

    // Give the investor something to sell.
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 200n, amount: 20_000, currency: Currency.USDT });
    await mp.investments.confirm(INVESTOR(), inv.id);
    await mp.investments.settle(INVESTOR(), inv.id);

    const listing = await mp.listings.create(INVESTOR(), {
      propertyId: p.id,
      tokenHoldingId: "hold_1",
      listingType: "fixed",
      price: 20_000,
      currency: Currency.USDT,
      quantity: 100n,
    });
    expect(listing.status).toBe(ListingStatus.Active);

    const sale = await mp.listings.completeSale(INVESTOR(), listing.id, {
      buyerId: eid("acc_buyer"),
      totalAmount: 20000n,
      platformFeeBps: 100n,
      currency: Currency.USDT,
    });
    expect(sale.status).toBe(SaleStatus.Completed);
    expect(repository.getOwnership(eid("acc_investor"), p.id)?.quantity).toBe(100n);
    expect(repository.getOwnership(eid("acc_buyer"), p.id)?.quantity).toBe(100n);
    expect(mp.listings.get(listing.id).status).toBe(ListingStatus.Sold);
  });

  it("rejects listing more tokens than owned", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    await expect(
      mp.listings.create(INVESTOR(), {
        propertyId: p.id,
        tokenHoldingId: "h",
        listingType: "fixed",
        price: 1,
        currency: Currency.USDT,
        quantity: 10n,
      }),
    ).rejects.toThrow();
  });

  it("cancels an active listing", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 200n, amount: 20_000, currency: Currency.USDT });
    await mp.investments.confirm(INVESTOR(), inv.id);
    await mp.investments.settle(INVESTOR(), inv.id);
    const listing = await mp.listings.create(INVESTOR(), {
      propertyId: p.id,
      tokenHoldingId: "hold_1",
      listingType: "fixed",
      price: 20_000,
      currency: Currency.USDT,
      quantity: 50n,
    });
    const cancelled = await mp.listings.cancel(INVESTOR(), listing.id);
    expect(cancelled.status).toBe(ListingStatus.Cancelled);
  });
});
