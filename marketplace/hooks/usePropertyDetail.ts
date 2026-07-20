/**
 * Property detail hook — wraps the detail service with React state and
 * retry. Reads the collections store to seed bookmark/favourite flags.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPropertyDetail } from "@/marketplace/services/propertyDetail";
import type {
  MarketplaceProperty,
  MarketplacePropertyDetail,
} from "@/marketplace/types";

interface PropertyDetailState {
  status: "loading" | "populated" | "not-found" | "error";
  property: MarketplacePropertyDetail | null;
  related: MarketplaceProperty[];
  error: string | null;
  retry: () => void;
}

export function usePropertyDetail(slug: string): PropertyDetailState {
  const [state, setState] = useState<PropertyDetailState>({
    status: "loading",
    property: null,
    related: [],
    error: null,
    retry: () => {},
  });
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setState((s) => ({ ...s, status: "loading", error: null }));
    });

    fetchPropertyDetail(slug)
      .then((res) => {
        if (cancelled) return;
        setState({
          status: res.status,
          property: res.property,
          related: res.related,
          error: res.error,
          retry,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "error",
          property: null,
          related: [],
          error: "Unable to load this property. Please try again.",
          retry,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, nonce, retry]);

  return { ...state, retry };
}
