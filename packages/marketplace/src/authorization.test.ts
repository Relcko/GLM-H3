import { describe, it, expect } from "vitest";
import { PermissionError } from "@relcko/error";
import { Currency } from "@relcko/types";
import { INVESTOR, MANAGER, makeMarketplace, makePropertyInput } from "./test-helpers";

describe("Marketplace authorization", () => {
  it("blocks non-managers from creating properties", async () => {
    const { mp } = makeMarketplace();
    await expect(mp.properties.create(INVESTOR(), makePropertyInput())).rejects.toThrow(PermissionError);
  });

  it("allows a property manager to create and publish", async () => {
    const { mp } = makeMarketplace();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());
    expect(p.status).toBe("draft");
  });

  it("blocks investing by a non-investor role", async () => {
    const { mp } = makeMarketplace();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());
    await mp.properties.publish(MANAGER(), p.id);
    await mp.properties.activate(MANAGER(), p.id);
    await expect(
      mp.investments.reserve(MANAGER(), { propertyId: p.id, tokens: 10n, amount: 1000, currency: Currency.USDT }),
    ).rejects.toThrow(PermissionError);
  });
});
