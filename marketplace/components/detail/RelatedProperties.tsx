"use client";

import { MarketplaceGrid } from "../MarketplaceGrid";
import type { MarketplaceProperty } from "@/marketplace/types";

export function RelatedProperties({
  properties,
  isBookmarked,
  onToggleBookmark,
}: {
  properties: MarketplaceProperty[];
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
}) {
  if (properties.length === 0) return null;
  return (
    <MarketplaceGrid
      properties={properties}
      isBookmarked={isBookmarked}
      onToggleBookmark={onToggleBookmark}
    />
  );
}
