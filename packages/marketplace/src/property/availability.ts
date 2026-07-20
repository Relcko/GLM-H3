import { PropertyStatus, applyInvestmentToSupply, type Property } from "@relcko/domain-core";

/**
 * Availability engine. Pure functions over the frozen `Property` supply fields.
 * "remaining allocation" is the monetary value of the still-available tokens.
 */
export class PropertyAvailabilityEngine {
  remainingAllocationValue(property: Property) {
    return { amount: property.availableTokens * property.tokenPrice.amount, currency: property.tokenPrice.currency };
  }

  availableFractions(property: Property): bigint {
    return property.availableTokens;
  }

  isAvailable(property: Property): boolean {
    return property.availableTokens > 0n && property.status !== PropertyStatus.Closed;
  }

  /** Tentatively apply an investment to supply (immutably). */
  reserveAllocation(property: Property, tokens: bigint): Property {
    return applyInvestmentToSupply(property, tokens);
  }
}
