import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type {
  Documents,
  Investment,
  MarketplaceListing,
  MarketplaceSale,
  Ownership,
  Property,
} from "@relcko/domain-core";
import type {
  Bookmark,
  Favorite,
  MediaAsset,
  PropertyAnalytics,
  PropertyTimelineEvent,
  RecentlyViewedEntry,
  WatchlistEntry,
} from "./types";

/**
 * Persistence seam for the marketplace. The interface is the contract; the
 * in-memory implementation is the default for the backend module. A real
 * adapter (SQL/NoSQL) can implement this interface without touching services.
 * The marketplace NEVER owns the canonical business entities — it stores and
 * retrieves the frozen domain-core `Property`/`Investment`/`MarketplaceListing`
 * /`Ownership`/`Documents` exactly as produced by domain-core.
 */
export interface MarketplaceRepository {
  // Properties
  saveProperty(p: Property): void;
  getProperty(id: EntityId): Property | undefined;
  getPropertyBySlug(slug: string): Property | undefined;
  listProperties(): Property[];
  deleteProperty(id: EntityId): void;

  // Investments
  saveInvestment(i: Investment): void;
  getInvestment(id: EntityId): Investment | undefined;
  listInvestmentsByProperty(propertyId: EntityId): Investment[];
  listInvestmentsByInvestor(investorId: EntityId): Investment[];

  // Listings
  saveListing(l: MarketplaceListing): void;
  getListing(id: EntityId): MarketplaceListing | undefined;
  listListingsByProperty(propertyId: EntityId): MarketplaceListing[];
  listListingsBySeller(sellerId: EntityId): MarketplaceListing[];

  // Sales
  saveSale(s: MarketplaceSale): void;
  getSale(id: EntityId): MarketplaceSale | undefined;

  // Ownership
  saveOwnership(o: Ownership): void;
  getOwnership(investorId: EntityId, propertyId: EntityId): Ownership | undefined;
  listOwnershipsByInvestor(investorId: EntityId): Ownership[];

  // Documents
  saveDocument(d: Documents): void;
  getDocument(id: EntityId): Documents | undefined;
  listDocumentsByProperty(propertyId: EntityId): Documents[];
  deleteDocument(id: EntityId): void;

  // Media
  saveMedia(m: MediaAsset): void;
  getMedia(id: EntityId): MediaAsset | undefined;
  listMediaByProperty(propertyId: EntityId): MediaAsset[];
  deleteMedia(id: EntityId): void;

  // Timeline
  saveTimelineEvent(e: PropertyTimelineEvent): void;
  listTimeline(propertyId: EntityId): PropertyTimelineEvent[];

  // Analytics
  recordView(propertyId: EntityId, viewerId?: EntityId): void;
  getAnalytics(propertyId: EntityId): PropertyAnalytics;

  // Collections
  addBookmark(accountId: EntityId, propertyId: EntityId): void;
  removeBookmark(accountId: EntityId, propertyId: EntityId): void;
  listBookmarks(accountId: EntityId): EntityId[];
  addFavorite(accountId: EntityId, propertyId: EntityId): void;
  removeFavorite(accountId: EntityId, propertyId: EntityId): void;
  listFavorites(accountId: EntityId): EntityId[];
  addWatchlist(accountId: EntityId, propertyId: EntityId, note?: string): void;
  removeWatchlist(accountId: EntityId, propertyId: EntityId): void;
  listWatchlist(accountId: EntityId): WatchlistEntry[];
  recordRecentlyViewed(accountId: EntityId, propertyId: EntityId): void;
  listRecentlyViewed(accountId: EntityId): EntityId[];
}

export class InMemoryMarketplaceRepository implements MarketplaceRepository {
  private readonly properties = new Map<EntityId, Property>();
  private readonly propertiesBySlug = new Map<string, EntityId>();
  private readonly investments = new Map<EntityId, Investment>();
  private readonly listings = new Map<EntityId, MarketplaceListing>();
  private readonly sales = new Map<EntityId, MarketplaceSale>();
  private readonly ownerships = new Map<string, Ownership>();
  private readonly documents = new Map<EntityId, Documents>();
  private readonly media = new Map<EntityId, MediaAsset>();
  private readonly timeline = new Map<EntityId, PropertyTimelineEvent[]>();
  private readonly views = new Map<EntityId, number>();
  private readonly uniqueViewers = new Map<EntityId, Set<string>>();
  private readonly lastViewedAt = new Map<EntityId, string>();
  private readonly bookmarks = new Map<EntityId, Set<EntityId>>();
  private readonly favorites = new Map<EntityId, Set<EntityId>>();
  private readonly watchlist = new Map<EntityId, Map<EntityId, WatchlistEntry>>();
  private readonly recentlyViewed = new Map<EntityId, RecentlyViewedEntry[]>();

  private ownershipKey(investorId: EntityId, propertyId: EntityId): string {
    return `${investorId}:${propertyId}`;
  }

  saveProperty(p: Property): void {
    if (this.properties.has(p.id)) {
      const prev = this.propertiesBySlug.get(p.slug);
      if (prev && prev !== p.id) this.propertiesBySlug.delete(prev);
    }
    this.properties.set(p.id, p);
    this.propertiesBySlug.set(p.slug, p.id);
  }
  getProperty(id: EntityId): Property | undefined {
    return this.properties.get(id);
  }
  getPropertyBySlug(slug: string): Property | undefined {
    const id = this.propertiesBySlug.get(slug);
    return id ? this.properties.get(id) : undefined;
  }
  listProperties(): Property[] {
    return [...this.properties.values()];
  }
  deleteProperty(id: EntityId): void {
    const p = this.properties.get(id);
    if (p) this.propertiesBySlug.delete(p.slug);
    this.properties.delete(id);
  }

  saveInvestment(i: Investment): void {
    this.investments.set(i.id, i);
  }
  getInvestment(id: EntityId): Investment | undefined {
    return this.investments.get(id);
  }
  listInvestmentsByProperty(propertyId: EntityId): Investment[] {
    return [...this.investments.values()].filter((i) => i.propertyId === propertyId);
  }
  listInvestmentsByInvestor(investorId: EntityId): Investment[] {
    return [...this.investments.values()].filter((i) => i.investorId === investorId);
  }

  saveListing(l: MarketplaceListing): void {
    this.listings.set(l.id, l);
  }
  getListing(id: EntityId): MarketplaceListing | undefined {
    return this.listings.get(id);
  }
  listListingsByProperty(propertyId: EntityId): MarketplaceListing[] {
    return [...this.listings.values()].filter((l) => l.propertyId === propertyId);
  }
  listListingsBySeller(sellerId: EntityId): MarketplaceListing[] {
    return [...this.listings.values()].filter((l) => l.sellerId === sellerId);
  }

  saveSale(s: MarketplaceSale): void {
    this.sales.set(s.id, s);
  }
  getSale(id: EntityId): MarketplaceSale | undefined {
    return this.sales.get(id);
  }

  saveOwnership(o: Ownership): void {
    this.ownerships.set(this.ownershipKey(o.investorId, o.propertyId), o);
  }
  getOwnership(investorId: EntityId, propertyId: EntityId): Ownership | undefined {
    return this.ownerships.get(this.ownershipKey(investorId, propertyId));
  }
  listOwnershipsByInvestor(investorId: EntityId): Ownership[] {
    return [...this.ownerships.values()].filter((o) => o.investorId === investorId);
  }

  saveDocument(d: Documents): void {
    this.documents.set(d.id, d);
  }
  getDocument(id: EntityId): Documents | undefined {
    return this.documents.get(id);
  }
  listDocumentsByProperty(propertyId: EntityId): Documents[] {
    return [...this.documents.values()].filter((d) => d.propertyId === propertyId);
  }
  deleteDocument(id: EntityId): void {
    this.documents.delete(id);
  }

  saveMedia(m: MediaAsset): void {
    this.media.set(m.id, m);
  }
  getMedia(id: EntityId): MediaAsset | undefined {
    return this.media.get(id);
  }
  listMediaByProperty(propertyId: EntityId): MediaAsset[] {
    return [...this.media.values()].filter((m) => m.propertyId === propertyId);
  }
  deleteMedia(id: EntityId): void {
    this.media.delete(id);
  }

  saveTimelineEvent(e: PropertyTimelineEvent): void {
    const list = this.timeline.get(e.propertyId) ?? [];
    list.push(e);
    this.timeline.set(e.propertyId, list);
  }
  listTimeline(propertyId: EntityId): PropertyTimelineEvent[] {
    return [...(this.timeline.get(propertyId) ?? [])];
  }

  recordView(propertyId: EntityId, viewerId?: EntityId): void {
    this.views.set(propertyId, (this.views.get(propertyId) ?? 0) + 1);
    if (viewerId) {
      const set = this.uniqueViewers.get(propertyId) ?? new Set<string>();
      set.add(viewerId);
      this.uniqueViewers.set(propertyId, set);
    }
    this.lastViewedAt.set(propertyId, new Date().toISOString());
  }
  getAnalytics(propertyId: EntityId): PropertyAnalytics {
    return {
      propertyId,
      views: this.views.get(propertyId) ?? 0,
      uniqueViewers: this.uniqueViewers.get(propertyId)?.size ?? 0,
      investmentCount: this.listInvestmentsByProperty(propertyId).length,
      listingCount: this.listListingsByProperty(propertyId).length,
      bookmarkCount: [...this.bookmarks.values()].filter((s) => s.has(propertyId)).length,
      favoriteCount: [...this.favorites.values()].filter((s) => s.has(propertyId)).length,
      watchlistCount: [...this.watchlist.values()].filter((m) => m.has(propertyId)).length,
      lastViewedAt: this.lastViewedAt.get(propertyId),
    };
  }

  addBookmark(accountId: EntityId, propertyId: EntityId): void {
    const set = this.bookmarks.get(accountId) ?? new Set<EntityId>();
    set.add(propertyId);
    this.bookmarks.set(accountId, set);
  }
  removeBookmark(accountId: EntityId, propertyId: EntityId): void {
    this.bookmarks.get(accountId)?.delete(propertyId);
  }
  listBookmarks(accountId: EntityId): EntityId[] {
    return [...(this.bookmarks.get(accountId) ?? [])];
  }
  addFavorite(accountId: EntityId, propertyId: EntityId): void {
    const set = this.favorites.get(accountId) ?? new Set<EntityId>();
    set.add(propertyId);
    this.favorites.set(accountId, set);
  }
  removeFavorite(accountId: EntityId, propertyId: EntityId): void {
    this.favorites.get(accountId)?.delete(propertyId);
  }
  listFavorites(accountId: EntityId): EntityId[] {
    return [...(this.favorites.get(accountId) ?? [])];
  }
  addWatchlist(accountId: EntityId, propertyId: EntityId, note?: string): void {
    const map = this.watchlist.get(accountId) ?? new Map<EntityId, WatchlistEntry>();
    map.set(propertyId, {
      accountId,
      propertyId,
      note,
      createdAt: new Date().toISOString(),
    });
    this.watchlist.set(accountId, map);
  }
  removeWatchlist(accountId: EntityId, propertyId: EntityId): void {
    this.watchlist.get(accountId)?.delete(propertyId);
  }
  listWatchlist(accountId: EntityId): WatchlistEntry[] {
    return [...(this.watchlist.get(accountId) ?? []).values()];
  }
  recordRecentlyViewed(accountId: EntityId, propertyId: EntityId): void {
    const list = this.recentlyViewed.get(accountId) ?? [];
    const filtered = list.filter((e) => e.propertyId !== propertyId);
    filtered.unshift({ accountId, propertyId, viewedAt: new Date().toISOString() });
    this.recentlyViewed.set(accountId, filtered.slice(0, 50));
  }
  listRecentlyViewed(accountId: EntityId): EntityId[] {
    return this.recentlyViewed.get(accountId)?.map((e) => e.propertyId) ?? [];
  }
}

/** Convenience factory. */
export function createInMemoryMarketplaceRepository(): MarketplaceRepository {
  return new InMemoryMarketplaceRepository();
}

/** Re-export so callers can generate ids consistently with the rest of the platform. */
export { generateId };
