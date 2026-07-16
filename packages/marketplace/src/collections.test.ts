import { describe, it, expect } from "vitest";
import { PermissionError } from "@relcko/error";
import { INVESTOR, MANAGER, makeMarketplace, makePropertyInput } from "./test-helpers";

describe("CollectionsService", () => {
  it("bookmarks and enforces account ownership", async () => {
    const { mp } = makeMarketplace();
    const owner = INVESTOR();
    const other = INVESTOR({ id: "acc_other" });
    const p = await mp.properties.create(MANAGER(), makePropertyInput());

    await mp.collections.addBookmark(owner, owner.id, p.id);
    expect(mp.collections.listBookmarks(owner.id)).toContain(p.id);

    await expect(mp.collections.addBookmark(other, owner.id, p.id)).rejects.toThrow(PermissionError);
  });

  it("manages favorites, watchlist and recently viewed", async () => {
    const { mp } = makeMarketplace();
    const owner = INVESTOR();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());

    await mp.collections.addFavorite(owner, owner.id, p.id);
    expect(mp.collections.listFavorites(owner.id)).toContain(p.id);

    await mp.collections.addWatchlist(owner, owner.id, { propertyId: p.id, note: "watch" });
    expect(mp.collections.listWatchlist(owner.id).length).toBe(1);

    await mp.collections.recordRecentlyViewed(owner, owner.id, p.id);
    expect(mp.collections.listRecentlyViewed(owner.id)).toContain(p.id);
  });
});
