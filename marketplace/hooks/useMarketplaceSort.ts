"use client";

import { useCallback, useState } from "react";
import type { SortKey } from "@/marketplace/types";

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  funding: "Funding %",
  roi: "Highest ROI",
  minInvestAsc: "Lowest Investment",
  minInvestDesc: "Highest Investment",
  alphabetical: "Alphabetical",
};

export function useMarketplaceSort(initial: SortKey = "newest") {
  const [sort, setSort] = useState<SortKey>(initial);

  const setSortKey = useCallback((key: SortKey) => setSort(key), []);

  return { sort, setSort: setSortKey };
}
