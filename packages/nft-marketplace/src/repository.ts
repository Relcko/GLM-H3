import type { EntityId } from "@relcko/types";
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

export interface NftRepository {
  saveNft(nft: NftToken): void;
  getNft(id: EntityId): NftToken | undefined;
  getNftByTokenId(tokenId: string, collectionId: EntityId): NftToken | undefined;
  listNftsByOwner(ownerId: EntityId): NftToken[];
  listNftsByCollection(collectionId: EntityId): NftToken[];
  listNftsByProperty(propertyId: EntityId): NftToken[];

  saveCollection(c: NftCollection): void;
  getCollection(id: EntityId): NftCollection | undefined;
  listCollectionsByCreator(creatorId: EntityId): NftCollection[];
  listCollections(): NftCollection[];
  searchCollections(query: string): NftCollection[];

  saveMetadata(m: NftMetadata): void;
  getMetadata(nftId: EntityId): NftMetadata | undefined;

  saveMedia(m: NftMedia): void;
  listMediaByNft(nftId: EntityId): NftMedia[];

  saveListing(l: NftListing): void;
  getListing(id: EntityId): NftListing | undefined;
  listListingsByNft(nftId: EntityId): NftListing[];
  listActiveListings(): NftListing[];
  listListingsBySeller(sellerId: EntityId): NftListing[];

  saveOffer(o: NftOffer): void;
  getOffer(id: EntityId): NftOffer | undefined;
  listOffersByNft(nftId: EntityId): NftOffer[];
  listOffersByBidder(bidderId: EntityId): NftOffer[];
  listOffersBySeller(sellerId: EntityId): NftOffer[];

  saveAuction(a: NftAuction): void;
  getAuction(id: EntityId): NftAuction | undefined;
  getAuctionByListing(listingId: EntityId): NftAuction | undefined;
  listActiveAuctions(): NftAuction[];
  listAuctionsBySeller(sellerId: EntityId): NftAuction[];

  saveBid(b: NftBid): void;
  listBidsByAuction(auctionId: EntityId): NftBid[];

  saveActivity(e: NftActivityEntry): void;
  listActivityByNft(nftId: EntityId): NftActivityEntry[];
  listActivityByCollection(collectionId: EntityId): NftActivityEntry[];

  saveAnalytics(a: NftAnalyticsEntry): void;
  getAnalytics(nftId: EntityId): NftAnalyticsEntry | undefined;

  savePortfolioSnapshot(s: NftPortfolioSnapshot): void;
  getPortfolioSnapshot(ownerId: EntityId): NftPortfolioSnapshot | undefined;

  saveRoyaltyConfig(r: RoyaltyConfig): void;
  getRoyaltyConfig(collectionId: EntityId): RoyaltyConfig | undefined;
  listRoyaltyConfigsByReceiver(receiverId: EntityId): RoyaltyConfig[];

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
