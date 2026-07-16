import { AssetType, PropertyStatus } from "@relcko/domain-core";
import type { SearchQuery } from "@relcko/marketplace";

export interface Option<T> {
  readonly value: T;
  readonly label: string;
}

export const ASSET_TYPE_OPTIONS: ReadonlyArray<Option<AssetType>> = [
  { value: AssetType.Residential, label: "Residential" },
  { value: AssetType.Commercial, label: "Commercial" },
  { value: AssetType.Land, label: "Land" },
];

export const STATUS_OPTIONS: ReadonlyArray<Option<PropertyStatus>> = [
  { value: PropertyStatus.Active, label: "Active" },
  { value: PropertyStatus.Upcoming, label: "Upcoming" },
  { value: PropertyStatus.SoldOut, label: "Sold Out" },
  { value: PropertyStatus.Closed, label: "Closed" },
];

export const COUNTRY_OPTIONS: ReadonlyArray<string> = [
  "Spain",
  "Portugal",
  "United Kingdom",
  "United States",
  "Germany",
  "Netherlands",
  "Japan",
  "United Arab Emirates",
  "France",
];

export const CITY_OPTIONS: ReadonlyArray<string> = [
  "Marbella",
  "Lisbon",
  "London",
  "New York",
  "Berlin",
  "Amsterdam",
  "Tokyo",
  "Dubai",
  "Paris",
];

export const SORT_OPTIONS: ReadonlyArray<Option<NonNullable<SearchQuery["sort"]>>> = [
  { value: "createdAt", label: "Newest" },
  { value: "funding", label: "Funding" },
  { value: "roi", label: "ROI" },
  { value: "yield", label: "Rental Yield" },
  { value: "tokenPrice", label: "Price" },
];

export type NumericRange = { min?: number; max?: number };

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: string | null): string | undefined {
  return v === null || v === "" ? undefined : v;
}

function bool(v: string | null): boolean | undefined {
  if (v === null || v === "") return undefined;
  return v === "true";
}

/** Parse a URLSearchParams into a backend SearchQuery (single source of truth). */
export function searchParamsToQuery(params: URLSearchParams): SearchQuery {
  const assetType = str(params.get("assetType")) as AssetType | undefined;
  const status = str(params.get("status")) as PropertyStatus | undefined;
  return {
    keyword: str(params.get("q")),
    assetType,
    status,
    country: str(params.get("country")),
    region: str(params.get("region")),
    city: str(params.get("city")),
    roiMin: num(params.get("roiMin")),
    roiMax: num(params.get("roiMax")),
    yieldMin: num(params.get("yieldMin")),
    yieldMax: num(params.get("yieldMax")),
    fundingMin: num(params.get("fundingMin")),
    fundingMax: num(params.get("fundingMax")),
    minInvestmentMax: num(params.get("minInvestmentMax")),
    availableOnly: bool(params.get("availableOnly")),
    sort: (str(params.get("sort")) as SearchQuery["sort"]) ?? "createdAt",
    order: (str(params.get("order")) as SearchQuery["order"]) ?? "desc",
    page: num(params.get("page")) ?? 0,
    pageSize: num(params.get("pageSize")),
  };
}

/** Serialize a SearchQuery back into URLSearchParams (omitting defaults). */
export function queryToParams(query: SearchQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (query.keyword) p.set("q", query.keyword);
  if (query.assetType) p.set("assetType", query.assetType);
  if (query.status) p.set("status", query.status);
  if (query.country) p.set("country", query.country);
  if (query.region) p.set("region", query.region);
  if (query.city) p.set("city", query.city);
  if (query.roiMin !== undefined) p.set("roiMin", String(query.roiMin));
  if (query.roiMax !== undefined) p.set("roiMax", String(query.roiMax));
  if (query.yieldMin !== undefined) p.set("yieldMin", String(query.yieldMin));
  if (query.yieldMax !== undefined) p.set("yieldMax", String(query.yieldMax));
  if (query.fundingMin !== undefined) p.set("fundingMin", String(query.fundingMin));
  if (query.fundingMax !== undefined) p.set("fundingMax", String(query.fundingMax));
  if (query.minInvestmentMax !== undefined) p.set("minInvestmentMax", String(query.minInvestmentMax));
  if (query.availableOnly) p.set("availableOnly", "true");
  if (query.sort && query.sort !== "createdAt") p.set("sort", query.sort);
  if (query.order && query.order !== "desc") p.set("order", query.order);
  if (query.page) p.set("page", String(query.page));
  if (query.pageSize) p.set("pageSize", String(query.pageSize));
  return p;
}

export function buildQueryString(query: SearchQuery): string {
  const s = queryToParams(query).toString();
  return s ? `?${s}` : "";
}

/** Count of non-default active filters (for the "clear all" affordance). */
export function activeFilterCount(query: SearchQuery): number {
  let n = 0;
  if (query.keyword) n++;
  if (query.assetType) n++;
  if (query.status) n++;
  if (query.country) n++;
  if (query.region) n++;
  if (query.city) n++;
  if (query.roiMin !== undefined || query.roiMax !== undefined) n++;
  if (query.yieldMin !== undefined || query.yieldMax !== undefined) n++;
  if (query.fundingMin !== undefined || query.fundingMax !== undefined) n++;
  if (query.minInvestmentMax !== undefined) n++;
  if (query.availableOnly) n++;
  return n;
}

/** Apply a saved filter preset (object) to a base query. */
export function applyPreset(base: SearchQuery, preset: Partial<SearchQuery>): SearchQuery {
  return { ...base, ...preset, page: 0 };
}
