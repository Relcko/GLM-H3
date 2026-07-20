"use client";

import { memo } from "react";
import type { Property } from "@relcko/domain-core";
import { PropertyCard } from "./PropertyCard";

function Grid({ properties, className = "" }: { properties: Property[]; className?: string }) {
  if (properties.length === 0) return null;
  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}

export const MarketplaceGrid = memo(Grid);
