import type { EntityId, Money } from "@relcko/types";
import {
  AssetType,
  type Documents,
  type Investment,
  type MarketplaceListing,
  type MarketplaceSale,
  type Ownership,
  type Property,
  PropertyStatus,
} from "@relcko/domain-core";

/**
 * Marketplace-specific types. These are NOT business-state models — the frozen
 * `domain-core` `Property`/`Investment`/`MarketplaceListing` entities and their
 * `PropertyStatus`/`InvestmentStatus`/`ListingStatus` enums remain the single
 * source of truth for business state. The types here describe operational
 * concerns (media, collections, timeline, analytics, search) and read-models.
 */

/** Kinds of media attached to a property (images, video, floor plans, etc.). */
export enum MediaKind {
  Image = "image",
  Video = "video",
  FloorPlan = "floor_plan",
  Legal = "legal",
  Certificate = "certificate",
  Virtual3D = "virtual_3d",
}

/** A marketplace media asset. Distinct from legal Documents. */
export interface MediaAsset {
  readonly id: EntityId;
  readonly propertyId: EntityId;
  readonly kind: MediaKind;
  readonly url: string;
  readonly title?: string;
  readonly size?: number;
  readonly uploadedBy: EntityId;
  readonly uploadedAt: string;
}

export interface Bookmark {
  readonly accountId: EntityId;
  readonly propertyId: EntityId;
  readonly createdAt: string;
}

export interface Favorite {
  readonly accountId: EntityId;
  readonly propertyId: EntityId;
  readonly createdAt: string;
}

export interface WatchlistEntry {
  readonly accountId: EntityId;
  readonly propertyId: EntityId;
  readonly note?: string;
  readonly createdAt: string;
}

export interface RecentlyViewedEntry {
  readonly accountId: EntityId;
  readonly propertyId: EntityId;
  readonly viewedAt: string;
}

/** An append-only operational timeline entry for a property. */
export interface PropertyTimelineEvent {
  readonly id: EntityId;
  readonly propertyId: EntityId;
  readonly type: string;
  readonly actorId: EntityId;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Read-model aggregate of property engagement signals. */
export interface PropertyAnalytics {
  readonly propertyId: EntityId;
  readonly views: number;
  readonly uniqueViewers: number;
  readonly investmentCount: number;
  readonly listingCount: number;
  readonly bookmarkCount: number;
  readonly favoriteCount: number;
  readonly watchlistCount: number;
  readonly lastViewedAt?: string;
}

/** Computed investment metrics for a property. */
export interface PropertyMetrics {
  readonly propertyId: EntityId;
  readonly fundingPct: number;
  readonly totalTokens: bigint;
  readonly soldTokens: bigint;
  readonly availableTokens: bigint;
  readonly remainingAllocation: Money;
  readonly availableFractions: bigint;
  readonly minInvestment: Money;
  readonly tokenPrice: Money;
  readonly expectedRoi: number;
  readonly rentalYield: number;
  readonly appreciationRate: number;
  readonly investorCount: number;
}

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly requiredKyc: boolean;
}

export interface SearchQuery {
  readonly keyword?: string;
  readonly assetType?: AssetType;
  readonly status?: PropertyStatus;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly roiMin?: number;
  readonly roiMax?: number;
  readonly yieldMin?: number;
  readonly yieldMax?: number;
  readonly fundingMin?: number;
  readonly fundingMax?: number;
  readonly minInvestmentMax?: number;
  readonly availableOnly?: boolean;
  readonly sort?: "funding" | "roi" | "yield" | "createdAt" | "tokenPrice";
  readonly order?: "asc" | "desc";
  readonly page?: number;
  readonly pageSize?: number;
}

export interface SearchResult {
  readonly items: readonly Property[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export type { Documents, Investment, MarketplaceListing, MarketplaceSale, Ownership, Property };
