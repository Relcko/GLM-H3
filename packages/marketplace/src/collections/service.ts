import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import { PermissionError } from "@relcko/error";
import type { Logger } from "@relcko/logging";
import { MarketplaceAuthorization, type Principal, subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateCollectionItem, validateWatchlist } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { PropertyNotFoundError } from "../errors";

/**
 * User-centric collections: bookmarks, favorites, watchlist and recently
 * viewed. Each is scoped to the owning account — an actor may only mutate its
 * own collections (enforced by `ensureOwner`). Every change emits an event.
 */
export class CollectionsService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  private ensureOwner(principal: Principal, accountId: EntityId): void {
    if (subjectId(principal) !== accountId) {
      throw new PermissionError("Cannot modify another account's collections", "COLLECTION_FORBIDDEN", {
        actor: subjectId(principal),
        accountId,
      });
    }
  }

  private requireProperty(propertyId: EntityId): void {
    if (!this.repository.getProperty(propertyId)) throw new PropertyNotFoundError(propertyId);
  }

  // ---- Bookmarks ----
  async addBookmark(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.requireProperty(propertyId);
    this.repository.addBookmark(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.BookmarkAdded, propertyId, accountId, { accountId });
  }
  async removeBookmark(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.repository.removeBookmark(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.BookmarkRemoved, propertyId, accountId, { accountId });
  }
  listBookmarks(accountId: EntityId): EntityId[] {
    return this.repository.listBookmarks(accountId);
  }

  // ---- Favorites ----
  async addFavorite(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.requireProperty(propertyId);
    this.repository.addFavorite(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.FavoriteAdded, propertyId, accountId, { accountId });
  }
  async removeFavorite(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.repository.removeFavorite(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.FavoriteRemoved, propertyId, accountId, { accountId });
  }
  listFavorites(accountId: EntityId): EntityId[] {
    return this.repository.listFavorites(accountId);
  }

  // ---- Watchlist ----
  async addWatchlist(principal: Principal, accountId: EntityId, input: unknown): Promise<void> {
    this.ensureOwner(principal, accountId);
    const v = validateWatchlist(input);
    this.requireProperty(v.propertyId);
    this.repository.addWatchlist(accountId, v.propertyId, v.note);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.WatchlistAdded, v.propertyId, accountId, {
      accountId,
      note: v.note ?? null,
    });
  }
  async removeWatchlist(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.repository.removeWatchlist(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.WatchlistRemoved, propertyId, accountId, { accountId });
  }
  listWatchlist(accountId: EntityId) {
    return this.repository.listWatchlist(accountId);
  }

  // ---- Recently viewed ----
  async recordRecentlyViewed(principal: Principal, accountId: EntityId, propertyId: EntityId): Promise<void> {
    this.ensureOwner(principal, accountId);
    this.repository.recordRecentlyViewed(accountId, propertyId);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.RecentlyViewed, propertyId, accountId, { accountId });
  }
  listRecentlyViewed(accountId: EntityId): EntityId[] {
    return this.repository.listRecentlyViewed(accountId);
  }
}
