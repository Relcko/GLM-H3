import type { MarketplaceProperty, SortKey } from "@/marketplace/types";

/**
 * Pure comparator factory for the selected sort key. Returns a function
 * suitable for Array.prototype.sort (negative/zero/positive).
 */
export function getSortComparator(
  sort: SortKey
): (a: MarketplaceProperty, b: MarketplaceProperty) => number {
  switch (sort) {
    case "newest":
      return (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "funding":
      return (a, b) => b.fundingProgress - a.fundingProgress;
    case "roi":
      return (a, b) => b.expectedRoi - a.expectedRoi;
    case "minInvestAsc":
      return (a, b) => a.minInvestment - b.minInvestment;
    case "minInvestDesc":
      return (a, b) => b.minInvestment - a.minInvestment;
    case "alphabetical":
      return (a, b) => a.name.localeCompare(b.name);
    default:
      return () => 0;
  }
}
