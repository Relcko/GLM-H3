"use client";

import { useCallback, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

export function useMarketplaceSearch(delay = 220) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, delay);

  const clear = useCallback(() => setQuery(""), []);

  return { query, debounced, setQuery, clear };
}
