/**
 * Marketplace view-model + UI types.
 *
 * These types describe what the browsing UI consumes — a *derived* projection
 * of the raw DOMAIN_MODEL entities (Property + SPV) plus the filter/sort/state
 * contract. No business logic lives here.
 */

import type {
  AssetType,
  FaqItem,
  OwnershipStructure,
  PropertyAmenityGroup,
  PropertyDocument,
  PropertyFraction,
  PropertyStatus,
  PropertyTimelineEvent,
  RiskDisclosure,
  SPV,
} from "@/marketplace/domain";

/**
 * The flattened, display-ready property.
 *
 * Stored domain fields are carried through verbatim (camelCased to match TS
 * conventions). Derived fields (`targetRaise`, `raisedAmount`,
 * `fundingProgress`, `availableFractions`, `hasSpv`) are computed from the
 * domain data and never persisted.
 */
export interface MarketplaceProperty {
  // identity
  id: string;
  slug: string;
  name: string;
  description: string;
  country: string;
  city: string;
  address: string;
  assetType: AssetType;
  status: PropertyStatus;
  images: string[];
  createdAt: string;
  updatedAt: string;

  // financials (from domain)
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  soldTokens: number;
  expectedRoi: number;
  rentalYield: number;
  appreciationRate: number;
  minInvestment: number;
  occupancy: number;
  blockchain: string;
  contractAddress: string;
  tokenId: string;

  // derived display fields
  /** token_price * total_tokens — the total offering size. */
  targetRaise: number;
  /** token_price * sold_tokens — capital raised so far. */
  raisedAmount: number;
  /** sold_tokens / total_tokens, 0..1. */
  fundingProgress: number;
  /** Alias of available_tokens for card clarity. */
  availableFractions: number;

  // relations
  spv: SPV | null;
  hasSpv: boolean;

  // favourite flag (UI-only, persisted in the collections store)
  isFavourite?: boolean;
}

/**
 * The full detail projection consumed by the property details route.
 *
 * Extends {@link MarketplaceProperty} with the secondary surfaces. `related`
 * is a list of slugs resolved by the detail service, never stored.
 */
export interface MarketplacePropertyDetail extends MarketplaceProperty {
  amenities: PropertyAmenityGroup[];
  documents: PropertyDocument[];
  timeline: PropertyTimelineEvent[];
  faq: FaqItem[];
  risk: RiskDisclosure;
  ownership: OwnershipStructure;
  relatedSlugs: string[];
}

export type MarketplaceStatus = "loading" | "populated" | "empty" | "error";

export type SortKey =
  | "newest"
  | "funding"
  | "roi"
  | "minInvestAsc"
  | "minInvestDesc"
  | "alphabetical";

export interface RangeFilter {
  min: number | null;
  max: number | null;
}

export type RangeKey = "roi" | "price" | "funding";

export interface FilterState {
  countries: string[];
  cities: string[];
  assetTypes: AssetType[];
  statuses: PropertyStatus[];
  /** expected_roi range, %. */
  roi: RangeFilter;
  /** token_price range (price per fraction). */
  price: RangeFilter;
  /** funding progress range, 0..100. */
  funding: RangeFilter;
}

export interface FilterOptions {
  countries: string[];
  cities: string[];
  assetTypes: AssetType[];
  statuses: PropertyStatus[];
  roiRange: [number, number];
  priceRange: [number, number];
  fundingRange: [number, number];
}

export interface MarketplaceData {
  properties: MarketplaceProperty[];
  fractions: PropertyFraction[];
}
