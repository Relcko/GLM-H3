import type { MarketplaceProperty } from "@/marketplace/types";

const SEARCH_FIELDS: (keyof MarketplaceProperty)[] = [
  "name",
  "country",
  "city",
  "address",
  "description",
];

/**
 * Case-insensitive substring match across the property's public text fields.
 * Pure — safe to call inside useMemo.
 */
export function matchesQuery(
  property: MarketplaceProperty,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const spvName = property.spv?.legal_name?.toLowerCase() ?? "";
  const spvJur = property.spv?.jurisdiction?.toLowerCase() ?? "";
  const asset = property.assetType.toLowerCase();
  const status = property.status.toLowerCase();
  return (
    SEARCH_FIELDS.some((f) => {
      const v = property[f];
      return typeof v === "string" && v.toLowerCase().includes(q);
    }) ||
    spvName.includes(q) ||
    spvJur.includes(q) ||
    asset.includes(q) ||
    status.includes(q)
  );
}
