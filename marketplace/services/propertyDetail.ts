/**
 * Property detail service — the async data-access layer for the detail route.
 *
 * UI-only: simulates a network round-trip against the mock repository so the
 * loading / error / not-found / populated states are all exercised. The swap
 * point for a real Marketplace API. No business logic, no validation.
 */

import {
  getMarketplacePropertyDetail,
  resolveProperties,
} from "@/marketplace/mock";
import type {
  MarketplaceProperty,
  MarketplacePropertyDetail,
} from "@/marketplace/types";

export type PropertyDetailStatus =
  | "loading"
  | "populated"
  | "not-found"
  | "error";

export interface PropertyDetailResult {
  status: PropertyDetailStatus;
  property: MarketplacePropertyDetail | null;
  related: MarketplaceProperty[];
  error: string | null;
}

function demoError(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "error";
}

/** Simulated async fetch of a single property + its related set. */
export function fetchPropertyDetail(
  slug: string,
  delay = 650
): Promise<PropertyDetailResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (demoError()) {
        resolve({
          status: "error",
          property: null,
          related: [],
          error: "Unable to load this property. Please try again.",
        });
        return;
      }
      const property = getMarketplacePropertyDetail(slug);
      if (!property) {
        resolve({
          status: "not-found",
          property: null,
          related: [],
          error: null,
        });
        return;
      }
      resolve({
        status: "populated",
        property,
        related: resolveProperties(property.relatedSlugs),
        error: null,
      });
    }, delay);
  });
}
