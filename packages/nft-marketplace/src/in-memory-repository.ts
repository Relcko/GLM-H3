import type { EntityId } from "@relcko/types";
import type { NftRepository } from "./repository";
import type {
  NftToken,
  NftCollection,
  NftMetadata,
  NftMedia,
  NftListing,
  NftOffer,
  NftAuction,
  NftBid,
  NftActivityEntry,
  NftAnalyticsEntry,
  NftPortfolioSnapshot,
  RoyaltyConfig,
} from "./types";

export class InMemoryNftRepository implements NftRepository {
  private readonly nfts = new Map<EntityId, NftToken>();
  private readonly nftsByTokenId = new Map<string, EntityId>();
  private readonly collections = new Map<EntityId, NftCollection>();
  private readonly metadata = new Map<EntityId, NftMetadata>();
  private readonly media = new Map<EntityId, NftMedia[]>();
  private readonly listings = new Map<EntityId, NftListing>();
  private readonly offers = new Map<EntityId, NftOffer>();
  private readonly auctions = new Map<EntityId, NftAuction>();
  private readonly bids = new Map<EntityId, NftBid[]>();
  private readonly activities = new Map<EntityId, NftActivityEntry[]>();
  private readonly analytics = new Map<EntityId, NftAnalyticsEntry>();
  private readonly portfolioSnapshots = new Map<EntityId, NftPortfolioSnapshot>();
  private readonly royaltyConfigs = new Map<EntityId, RoyaltyConfig>();
  private readonly processedEvents = new Set<string>();

  private tokenKey(tokenId: string, collectionId: EntityId): string {
    return `${collectionId}:${tokenId}`;
  }

  saveNft(nft: NftToken): void {
    this.nfts.set(nft.id, nft);
    this.nftsByTokenId.set(this.tokenKey(nft.tokenId, nft.collectionId), nft.id);
  }

  getNft(id: EntityId): NftToken | undefined {
    return this.nfts.get(id);
  }

  getNftByTokenId(tokenId: string, collectionId: EntityId): NftToken | undefined {
    const id = this.nftsByTokenId.get(this.tokenKey(tokenId, collectionId));
    return id ? this.nfts.get(id) : undefined;
  }

  listNftsByOwner(ownerId: EntityId): NftToken[] {
    return [...this.nfts.values()].filter(n => n.ownerId === ownerId);
  }

  listNftsByCollection(collectionId: EntityId): NftToken[] {
    return [...this.nfts.values()].filter(n => n.collectionId === collectionId);
  }

  listNftsByProperty(propertyId: EntityId): NftToken[] {
    return [...this.nfts.values()].filter(n => n.propertyId === propertyId);
  }

  saveCollection(c: NftCollection): void {
    this.collections.set(c.id, c);
  }

  getCollection(id: EntityId): NftCollection | undefined {
    return this.collections.get(id);
  }

  listCollectionsByCreator(creatorId: EntityId): NftCollection[] {
    return [...this.collections.values()].filter(c => c.creatorId === creatorId);
  }

  listCollections(): NftCollection[] {
    return [...this.collections.values()];
  }

  searchCollections(query: string): NftCollection[] {
    const lower = query.toLowerCase();
    return [...this.collections.values()].filter(
      c => c.name.toLowerCase().includes(lower) ||
           c.symbol.toLowerCase().includes(lower) ||
           c.description.toLowerCase().includes(lower),
    );
  }

  saveMetadata(m: NftMetadata): void {
    this.metadata.set(m.nftId, m);
  }

  getMetadata(nftId: EntityId): NftMetadata | undefined {
    return this.metadata.get(nftId);
  }

  saveMedia(m: NftMedia): void {
    const list = this.media.get(m.nftId) ?? [];
    list.push(m);
    this.media.set(m.nftId, list);
  }

  listMediaByNft(nftId: EntityId): NftMedia[] {
    return [...(this.media.get(nftId) ?? [])];
  }

  saveListing(l: NftListing): void {
    this.listings.set(l.id, l);
  }

  getListing(id: EntityId): NftListing | undefined {
    return this.listings.get(id);
  }

  listListingsByNft(nftId: EntityId): NftListing[] {
    return [...this.listings.values()].filter(l => l.nftId === nftId);
  }

  listActiveListings(): NftListing[] {
    return [...this.listings.values()].filter(l => l.status === "active");
  }

  listListingsBySeller(sellerId: EntityId): NftListing[] {
    return [...this.listings.values()].filter(l => l.sellerId === sellerId);
  }

  saveOffer(o: NftOffer): void {
    this.offers.set(o.id, o);
  }

  getOffer(id: EntityId): NftOffer | undefined {
    return this.offers.get(id);
  }

  listOffersByNft(nftId: EntityId): NftOffer[] {
    return [...this.offers.values()].filter(o => o.nftId === nftId);
  }

  listOffersByBidder(bidderId: EntityId): NftOffer[] {
    return [...this.offers.values()].filter(o => o.bidderId === bidderId);
  }

  listOffersBySeller(sellerId: EntityId): NftOffer[] {
    return [...this.offers.values()].filter(o => o.sellerId === sellerId);
  }

  saveAuction(a: NftAuction): void {
    this.auctions.set(a.id, a);
  }

  getAuction(id: EntityId): NftAuction | undefined {
    return this.auctions.get(id);
  }

  getAuctionByListing(listingId: EntityId): NftAuction | undefined {
    return [...this.auctions.values()].find(a => a.listingId === listingId);
  }

  listActiveAuctions(): NftAuction[] {
    return [...this.auctions.values()].filter(a => a.status === "active");
  }

  listAuctionsBySeller(sellerId: EntityId): NftAuction[] {
    return [...this.auctions.values()].filter(a => a.sellerId === sellerId);
  }

  saveBid(b: NftBid): void {
    const list = this.bids.get(b.auctionId) ?? [];
    list.push(b);
    this.bids.set(b.auctionId, list);
  }

  listBidsByAuction(auctionId: EntityId): NftBid[] {
    return [...(this.bids.get(auctionId) ?? [])];
  }

  saveActivity(e: NftActivityEntry): void {
    const list = this.activities.get(e.nftId) ?? [];
    list.push(e);
    this.activities.set(e.nftId, list);
  }

  listActivityByNft(nftId: EntityId): NftActivityEntry[] {
    return [...(this.activities.get(nftId) ?? [])];
  }

  listActivityByCollection(collectionId: EntityId): NftActivityEntry[] {
    return [...this.activities.values()].flat().filter(e => e.collectionId === collectionId);
  }

  saveAnalytics(a: NftAnalyticsEntry): void {
    this.analytics.set(a.nftId, a);
  }

  getAnalytics(nftId: EntityId): NftAnalyticsEntry | undefined {
    return this.analytics.get(nftId);
  }

  savePortfolioSnapshot(s: NftPortfolioSnapshot): void {
    this.portfolioSnapshots.set(s.ownerId, s);
  }

  getPortfolioSnapshot(ownerId: EntityId): NftPortfolioSnapshot | undefined {
    return this.portfolioSnapshots.get(ownerId);
  }

  saveRoyaltyConfig(r: RoyaltyConfig): void {
    this.royaltyConfigs.set(r.collectionId, r);
  }

  getRoyaltyConfig(collectionId: EntityId): RoyaltyConfig | undefined {
    return this.royaltyConfigs.get(collectionId);
  }

  listRoyaltyConfigsByReceiver(receiverId: EntityId): RoyaltyConfig[] {
    return [...this.royaltyConfigs.values()].filter(r => r.receiverId === receiverId);
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}

export function createInMemoryNftRepository(): NftRepository {
  return new InMemoryNftRepository();
}
