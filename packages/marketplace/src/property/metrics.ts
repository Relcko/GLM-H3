import type { Property } from "@relcko/domain-core";
import type { PropertyMetrics } from "../types";

/** Metrics engine. Derives read-model investment metrics from a property. */
export class PropertyMetricsEngine {
  compute(property: Property, investorCount: number): PropertyMetrics {
    const fundingPct =
      property.totalTokens === 0n
        ? 0
        : Number((property.soldTokens * 10_000n) / property.totalTokens) / 100;
    return {
      propertyId: property.id,
      fundingPct,
      totalTokens: property.totalTokens,
      soldTokens: property.soldTokens,
      availableTokens: property.availableTokens,
      remainingAllocation: {
        amount: property.availableTokens * property.tokenPrice.amount,
        currency: property.tokenPrice.currency,
      },
      availableFractions: property.availableTokens,
      minInvestment: property.minInvestment,
      tokenPrice: property.tokenPrice,
      expectedRoi: property.expectedRoi,
      rentalYield: property.rentalYield,
      appreciationRate: property.appreciationRate,
      investorCount,
    };
  }
}
