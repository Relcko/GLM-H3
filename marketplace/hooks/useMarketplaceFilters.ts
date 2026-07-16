"use client";

import { useCallback, useState } from "react";
import type { FilterState, RangeKey } from "@/marketplace/types";

export const EMPTY_FILTERS: FilterState = {
  countries: [],
  cities: [],
  assetTypes: [],
  statuses: [],
  roi: { min: null, max: null },
  price: { min: null, max: null },
  funding: { min: null, max: null },
};

export function useMarketplaceFilters() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const toggleInArray = useCallback(
    <T,>(key: keyof FilterState, value: T) => {
      setFilters((prev) => {
        const current = prev[key] as unknown as T[];
        const exists = current.includes(value);
        const next = exists
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const setRange = useCallback(
    (key: RangeKey, min: number | null, max: number | null) => {
      setFilters((prev) => ({ ...prev, [key]: { min, max } }));
    },
    []
  );

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const activeCount = useCallback((f: FilterState): number => {
    let n = 0;
    n += f.countries.length;
    n += f.cities.length;
    n += f.assetTypes.length;
    n += f.statuses.length;
    if (f.roi.min != null || f.roi.max != null) n += 1;
    if (f.price.min != null || f.price.max != null) n += 1;
    if (f.funding.min != null || f.funding.max != null) n += 1;
    return n;
  }, []);

  return { filters, setFilters, toggleInArray, setRange, reset, activeCount };
}
