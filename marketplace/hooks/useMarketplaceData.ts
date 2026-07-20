"use client";

import { useCallback, useEffect, useState } from "react";
import { getMarketplaceProperties } from "@/marketplace/mock";
import type { MarketplaceProperty, MarketplaceStatus } from "@/marketplace/types";

interface MarketplaceDataState {
  status: MarketplaceStatus;
  properties: MarketplaceProperty[];
  error: string | null;
  retry: () => void;
}

/**
 * Loads the (mock) marketplace dataset, simulating an async source so the
 * loading / error / empty / populated states are all exercised.
 *
 * Pass `?demo=error` to force the error branch for QA.
 */
export function useMarketplaceData(): MarketplaceDataState {
  const [status, setStatus] = useState<MarketplaceStatus>("loading");
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const forceError =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "error";

    const timer = setTimeout(() => {
      if (cancelled) return;
      if (forceError) {
        setStatus("error");
        setError("Unable to load marketplace properties. Please try again.");
        return;
      }
      const data = getMarketplaceProperties();
      setProperties(data);
      setStatus(data.length === 0 ? "empty" : "populated");
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nonce]);

  return { status, properties, error, retry };
}
