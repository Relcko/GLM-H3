import { describe, it, expect } from "vitest";
import { ListingStatus, SaleStatus } from "@relcko/domain-core";
import { Currency } from "@relcko/types";
import { INVESTOR, createActiveProperty, eid, makeMarketplace } from "./test-helpers";

describe("Marketplace integration (primary + secondary market)", () => {
  it("runs the full flow end to end", async () => {
    const { mp, repository } = makeMarketplace();
    const property = await createActiveProperty(mp);

    // --- Primary market: reserve -> confirm -> settle ---
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: property.id, tokens: 200n, amount: 20_000, currency: Currency.USDT });
    await mp.investments.confirm(INVESTOR(), inv.id);
    await mp.investments.settle(INVESTOR(), inv.id);

    expect(mp.properties.get(property.id).availableTokens).toBe(9_800n);
    expect(repository.getOwnership(eid("acc_investor"), property.id)?.quantity).toBe(200n);

    // --- Secondary market: list -> complete sale ---
    const listing = await mp.listings.create(INVESTOR(), {
      propertyId: property.id,
      tokenHoldingId: "hold_1",
      listingType: "fixed",
      price: 20_000,
      currency: Currency.USDT,
      quantity: 100n,
    });
    const sale = await mp.listings.completeSale(INVESTOR(), listing.id, {
      buyerId: eid("acc_buyer"),
      totalAmount: 20000n,
      platformFeeBps: 0n,
      currency: Currency.USDT,
    });

    expect(sale.status).toBe(SaleStatus.Completed);
    expect(repository.getOwnership(eid("acc_investor"), property.id)?.quantity).toBe(100n);
    expect(repository.getOwnership(eid("acc_buyer"), property.id)?.quantity).toBe(100n);
    expect(mp.listings.get(listing.id).status).toBe(ListingStatus.Sold);
  });
});
