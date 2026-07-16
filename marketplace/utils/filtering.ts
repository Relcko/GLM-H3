import type {
  FilterOptions,
  FilterState,
  MarketplaceProperty,
} from "@/marketplace/types";

function inRange(
  value: number,
  min: number | null,
  max: number | null
): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function inSet<T>(value: T, set: T[]): boolean {
  return set.length === 0 || set.includes(value);
}

/**
 * Apply the active filter state to a property. Pure + order-independent so it
 * can be memoized safely.
 */
export function matchesFilters(
  property: MarketplaceProperty,
  filters: FilterState
): boolean {
  if (!inSet(property.country, filters.countries)) return false;
  if (!inSet(property.city, filters.cities)) return false;
  if (!inSet(property.assetType, filters.assetTypes)) return false;
  if (!inSet(property.status, filters.statuses)) return false;

  const roi = property.expectedRoi;
  if (!inRange(roi, filters.roi.min, filters.roi.max)) return false;

  const price = property.tokenPrice;
  if (!inRange(price, filters.price.min, filters.price.max)) return false;

  const fundingPct = property.fundingProgress * 100;
  if (!inRange(fundingPct, filters.funding.min, filters.funding.max)) return false;

  return true;
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

/**
 * Derive the available filter options (and numeric ranges) from the loaded
 * dataset. Pure — memoize at the call site.
 */
export function getFilterOptions(
  properties: MarketplaceProperty[]
): FilterOptions {
  const rois = properties.map((p) => p.expectedRoi);
  const prices = properties.map((p) => p.tokenPrice);
  const fundings = properties.map((p) => p.fundingProgress * 100);

  const range = (arr: number[]): [number, number] => {
    if (arr.length === 0) return [0, 0];
    return [Math.floor(Math.min(...arr)), Math.ceil(Math.max(...arr))];
  };

  return {
    countries: uniqSorted(properties.map((p) => p.country)),
    cities: uniqSorted(properties.map((p) => p.city)),
    assetTypes: Array.from(
      new Set(properties.map((p) => p.assetType))
    ) as FilterOptions["assetTypes"],
    statuses: Array.from(
      new Set(properties.map((p) => p.status))
    ) as FilterOptions["statuses"],
    roiRange: range(rois),
    priceRange: range(prices),
    fundingRange: range(fundings),
  };
}
