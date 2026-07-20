import { describe, it, expect } from "vitest";
import { Currency } from "@relcko/types";
import { MarketplaceEventType } from "./events";
import { INVESTOR, MANAGER, createActiveProperty, makeMarketplace } from "./test-helpers";

describe("Marketplace canonical events", () => {
  it("publishes property + investment lifecycle events through the shared bus", async () => {
    const { mp, bus } = makeMarketplace();
    const p = await createActiveProperty(mp, MANAGER());
    const inv = await mp.investments.reserve(INVESTOR(), { propertyId: p.id, tokens: 10n, amount: 1000, currency: Currency.USDT });
    await mp.investments.confirm(INVESTOR(), inv.id);
    const types = bus.history.map((e) => e.type);
    expect(types).toContain(MarketplaceEventType.PropertyCreated);
    expect(types).toContain(MarketplaceEventType.PropertyActivated);
    expect(types).toContain(MarketplaceEventType.InvestmentReserved);
  });

  it("every published envelope is valid (source tagged)", async () => {
    const { mp, bus } = makeMarketplace();
    const p = await createActiveProperty(mp, MANAGER());
    expect(bus.history.every((e) => e.source === "relcko.marketplace")).toBe(true);
    expect(p.id).toBeDefined();
  });
});
