/**
 * Marketplace domain model.
 *
 * Field names mirror DOMAIN_MODEL.md (entities 1, 2, 15) exactly.
 * This module is framework-agnostic — no React, no Next, no persistence.
 *
 * Deviations from the literal spec, kept consistent with the domain intent:
 *  - `location` (a single field in the spec) is decomposed into
 *    { country, city, address } so the browsing UI can filter by Country/City.
 *  - `occupancy` is added as an operational building metric required by the
 *    marketplace browsing card (not present in the investable-spec entity).
 *  - `target_raise` / `raised_amount` / `funding_progress` are NOT stored;
 *    they are derived in the view model (see types/) from `token_price`
 *    and `total_tokens` / `sold_tokens`.
 */

export type PropertyStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "sold_out"
  | "closed";

export type AssetType = "residential" | "commercial" | "land";

export type SPVStatus = "formed" | "active" | "dissolved";

export interface PropertyLocation {
  country: string;
  city: string;
  address: string;
}

export interface Property {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: PropertyLocation;
  asset_type: AssetType;
  total_value: number;
  token_price: number;
  total_tokens: number;
  available_tokens: number;
  sold_tokens: number;
  expected_roi: number;
  rental_yield: number;
  appreciation_rate: number;
  min_investment: number;
  blockchain: string;
  contract_address: string;
  token_id: string;
  status: PropertyStatus;
  images: string[];
  created_at: string;
  updated_at: string;
  /** Operational metric required by the browsing card (see note above). */
  occupancy: number;
}

export interface PaymentToken {
  address: string;
  decimals: number;
  symbol: string;
}

export interface PropertyFraction {
  id: string;
  property_id: string;
  token_id: string;
  standard: string;
  total_supply: number;
  available_supply: number;
  price_per_token: number;
  payment_token: PaymentToken;
  metadata_uri: string;
  is_active: boolean;
  paused: boolean;
}

export interface SPV {
  id: string;
  property_id: string;
  legal_name: string;
  jurisdiction: string;
  registration_number: string;
  governing_document_url: string;
  bank_account_ref: string;
  status: SPVStatus;
  formed_at: string;
  dissolved_at: string | null;
}

export const PROPERTY_STATUSES: PropertyStatus[] = [
  "draft",
  "upcoming",
  "active",
  "sold_out",
  "closed",
];

export const ASSET_TYPES: AssetType[] = ["residential", "commercial", "land"];

export const SPV_STATUSES: SPVStatus[] = ["formed", "active", "dissolved"];
