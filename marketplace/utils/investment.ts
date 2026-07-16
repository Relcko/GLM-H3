/**
 * Investment calculator helpers — UI-only projections for the investment panel.
 *
 * These are display computations derived from the property view-model. They do
 * NOT constitute financial advice and contain no backend/validation logic; the
 * authoritative checks happen server-side. Pure + deterministic so they can be
 * memoized and unit-tested.
 */

import type { MarketplaceProperty } from "@/marketplace/types";

/** Whole fractions purchasable for a given amount at the current token price. */
export function fractionsForAmount(amount: number, tokenPrice: number): number {
  if (tokenPrice <= 0) return 0;
  return Math.floor(Math.max(0, amount) / tokenPrice);
}

/** Capital required to acquire a given number of fractions. */
export function amountForFractions(fractions: number, tokenPrice: number): number {
  return Math.max(0, Math.floor(fractions)) * tokenPrice;
}

/** Annual return in currency from an amount at the expected ROI (percent). */
export function expectedAnnualReturn(amount: number, expectedRoi: number): number {
  return (Math.max(0, amount) * expectedRoi) / 100;
}

/** Annual rental yield in currency from an amount at the rental yield (percent). */
export function expectedYield(amount: number, rentalYield: number): number {
  return (Math.max(0, amount) * rentalYield) / 100;
}

/** Combined annual projected return (ROI + yield) in currency. */
export function expectedAnnualTotal(
  amount: number,
  expectedRoi: number,
  rentalYield: number
): number {
  return expectedAnnualReturn(amount, expectedRoi) + expectedYield(amount, rentalYield);
}

/** Capital still required to fully fund the offering. */
export function fundingRemaining(property: MarketplaceProperty): number {
  return property.availableTokens * property.tokenPrice;
}

/** Fraction of the offering already funded, 0..1. */
export function fundingProgress(property: MarketplaceProperty): number {
  return property.fundingProgress;
}

export interface Eligibility {
  eligible: boolean;
  /** Human-readable reason when not eligible. */
  reason: string;
}

/**
 * UI eligibility gate — mirrors the min-investment rule only. Authoritative
 * KYC / jurisdiction checks remain server-side.
 */
export function checkEligibility(
  amount: number,
  property: MarketplaceProperty
): Eligibility {
  if (property.status === "sold_out") {
    return { eligible: false, reason: "This offering is fully funded." };
  }
  if (property.status === "closed") {
    return { eligible: false, reason: "This offering is closed." };
  }
  if (property.status === "upcoming") {
    return { eligible: false, reason: "Offering opens soon — join the watchlist." };
  }
  if (amount <= 0) {
    return { eligible: false, reason: "Enter an investment amount." };
  }
  if (amount < property.minInvestment) {
    return {
      eligible: false,
      reason: `Minimum investment is ${property.minInvestment.toLocaleString("en-US")} per fraction.`,
    };
  }
  const max = fundingRemaining(property);
  if (amount > max) {
    return {
      eligible: false,
      reason: "Amount exceeds remaining available capital.",
    };
  }
  return { eligible: true, reason: "Eligible to invest." };
}

/** Clamp an amount to the valid [min, remaining] window. */
export function clampAmount(
  amount: number,
  property: MarketplaceProperty
): number {
  const min = property.minInvestment;
  const max = fundingRemaining(property);
  return Math.min(Math.max(amount, min), max);
}
