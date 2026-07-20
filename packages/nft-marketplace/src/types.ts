import type { Address, EntityId, Money, TxHash } from "@relcko/types";

export enum NftStandard {
  ERC721 = "erc721",
  ERC1155 = "erc1155",
}

export enum NftType {
  Property = "property",
  Fraction = "fraction",
  Achievement = "achievement",
  Governance = "governance",
  AgentBadge = "agent_badge",
  Membership = "membership",
}

export enum NftStatus {
  Draft = "draft",
  Minted = "minted",
  Transferred = "transferred",
  Burned = "burned",
}

export enum ListingType {
  FixedPrice = "fixed_price",
  Auction = "auction",
  PrivateSale = "private_sale",
  CollectionSale = "collection_sale",
}

export enum ListingStatus {
  Active = "active",
  Filled = "filled",
  Cancelled = "cancelled",
  Expired = "expired",
}

export enum OfferStatus {
  Active = "active",
  Accepted = "accepted",
  Rejected = "rejected",
  Cancelled = "cancelled",
  Expired = "expired",
  Countered = "countered",
}

export enum AuctionStatus {
  Pending = "pending",
  Active = "active",
  Ended = "ended",
  Cancelled = "cancelled",
  Settled = "settled",
}

export enum VerificationStatus {
  Unverified = "unverified",
  Pending = "pending",
  Verified = "verified",
  Rejected = "rejected",
}

export enum ActivityType {
  Mint = "mint",
  Transfer = "transfer",
  Listing = "listing",
  Sale = "sale",
  Offer = "offer",
  Auction = "auction",
  Cancel = "cancel",
  MetadataUpdate = "metadata_update",
  Verification = "verification",
  Burn = "burn",
}

export interface NftToken {
  readonly id: EntityId;
  readonly tokenId: string;
  readonly collectionId: EntityId;
  readonly ownerId: EntityId;
  readonly creatorId: EntityId;
  readonly nftType: NftType;
  readonly standard: NftStandard;
  readonly metadataUri: string;
  readonly supply: bigint;
  readonly status: NftStatus;
  readonly propertyId?: EntityId;
  readonly fractionId?: EntityId;
  readonly contractAddress?: Address;
  readonly mintedAt: string;
  readonly updatedAt: string;
}

export interface NftCollection {
  readonly id: EntityId;
  readonly name: string;
  readonly symbol: string;
  readonly description: string;
  readonly creatorId: EntityId;
  readonly ownerId: EntityId;
  readonly standard: NftStandard;
  readonly contractAddress?: Address;
  readonly totalSupply: bigint;
  readonly verified: boolean;
  readonly verificationStatus: VerificationStatus;
  readonly metadataUri: string;
  readonly imageUrl?: string;
  readonly bannerUrl?: string;
  readonly category?: string;
  readonly royaltyBps: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NftMetadata {
  readonly id: EntityId;
  readonly nftId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly externalUrl?: string;
  readonly animationUrl?: string;
  readonly attributes: readonly NftAttribute[];
  readonly properties: Record<string, unknown>;
  readonly localization?: NftLocalization;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NftAttribute {
  readonly traitType: string;
  readonly value: string;
  readonly displayType?: string;
  readonly maxValue?: number;
}

export interface NftLocalization {
  readonly uri: string;
  readonly defaultLanguage: string;
  readonly locales: readonly string[];
}

export interface NftMedia {
  readonly id: EntityId;
  readonly nftId: EntityId;
  readonly kind: NftMediaKind;
  readonly url: string;
  readonly mimeType: string;
  readonly size: number;
  readonly createdAt: string;
}

export enum NftMediaKind {
  Image = "image",
  Video = "video",
  Model3D = "model_3d",
  Pdf = "pdf",
  Certificate = "certificate",
  FloorPlan = "floor_plan",
}

export interface NftListing {
  readonly id: EntityId;
  readonly nftId: EntityId;
  readonly sellerId: EntityId;
  readonly listingType: ListingType;
  readonly price?: Money;
  readonly minBid?: Money;
  readonly reservePrice?: Money;
  readonly quantity: bigint;
  readonly status: ListingStatus;
  readonly expiresAt?: string;
  readonly createdAt: string;
}

export interface NftOffer {
  readonly id: EntityId;
  readonly nftId: EntityId;
  readonly listingId?: EntityId;
  readonly bidderId: EntityId;
  readonly sellerId: EntityId;
  readonly amount: Money;
  readonly status: OfferStatus;
  readonly expiresAt?: string;
  readonly createdAt: string;
  readonly counteredOfferId?: EntityId;
}

export interface NftAuction {
  readonly id: EntityId;
  readonly listingId: EntityId;
  readonly nftId: EntityId;
  readonly sellerId: EntityId;
  readonly highestBidderId?: EntityId;
  readonly highestBid?: Money;
  readonly minBid: Money;
  readonly reservePrice?: Money;
  readonly startPrice: Money;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: AuctionStatus;
  readonly winnerId?: EntityId;
  readonly winningBid?: Money;
  readonly createdAt: string;
}

export interface NftBid {
  readonly id: EntityId;
  readonly auctionId: EntityId;
  readonly bidderId: EntityId;
  readonly amount: Money;
  readonly createdAt: string;
}

export interface NftActivityEntry {
  readonly id: EntityId;
  readonly nftId: EntityId;
  readonly collectionId: EntityId;
  readonly type: ActivityType;
  readonly actorId: EntityId;
  readonly fromId?: EntityId;
  readonly toId?: EntityId;
  readonly amount?: Money;
  readonly txHash?: TxHash;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: string;
}

export interface NftAnalyticsEntry {
  readonly nftId: EntityId;
  readonly collectionId: EntityId;
  readonly totalVolume: Money;
  readonly totalSales: number;
  readonly floorPrice?: Money;
  readonly averagePrice?: Money;
  readonly highestSale?: Money;
  readonly holderCount: number;
  readonly transferCount: number;
  readonly listingCount: number;
  readonly trendingScore: number;
  readonly updatedAt: string;
}

export interface NftSearchQuery {
  readonly keyword?: string;
  readonly collectionId?: EntityId;
  readonly creatorId?: EntityId;
  readonly ownerId?: EntityId;
  readonly propertyId?: EntityId;
  readonly nftType?: NftType;
  readonly category?: string;
  readonly traits?: Record<string, string>;
  readonly priceMin?: bigint;
  readonly priceMax?: bigint;
  readonly verified?: boolean;
  readonly sort?: "recent" | "price_asc" | "price_desc" | "trending" | "oldest";
  readonly page?: number;
  readonly pageSize?: number;
}

export interface NftSearchResult {
  readonly items: readonly NftToken[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface MintRequest {
  readonly collectionId: EntityId;
  readonly creatorId: EntityId;
  readonly ownerId: EntityId;
  readonly nftType: NftType;
  readonly standard: NftStandard;
  readonly supply: bigint;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly attributes?: readonly NftAttribute[];
  readonly properties?: Record<string, unknown>;
  readonly propertyId?: EntityId;
  readonly fractionId?: EntityId;
}

export interface NftPortfolioEntry {
  readonly nftId: EntityId;
  readonly collectionId: EntityId;
  readonly tokenId: string;
  readonly name: string;
  readonly image: string;
  readonly nftType: NftType;
  readonly quantity: bigint;
  readonly acquiredAt: string;
}

export interface NftPortfolioSnapshot {
  readonly ownerId: EntityId;
  readonly totalNfts: number;
  readonly totalCollections: number;
  readonly entries: readonly NftPortfolioEntry[];
  readonly computedAt: string;
}

export interface RoyaltyConfig {
  readonly collectionId: EntityId;
  readonly receiverId: EntityId;
  readonly bps: number;
  readonly maxBps: number;
}
