"use client";

import { PropertyCard } from "./PropertyCard";
import type { MarketplaceProperty } from "@/marketplace/types";

export function MarketplaceGrid({
  properties,
  isBookmarked,
  onToggleBookmark,
  isFavourite,
  onToggleFavorite,
  isComparing,
  onToggleCompare,
}: {
  properties: MarketplaceProperty[];
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  isFavourite?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
  isComparing?: (id: string) => boolean;
  onToggleCompare?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isBookmarked={isBookmarked(property.id)}
          onToggleBookmark={onToggleBookmark}
          isFavourite={isFavourite?.(property.id) ?? false}
          onToggleFavorite={onToggleFavorite}
          isComparing={isComparing?.(property.id) ?? false}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </div>
  );
}
