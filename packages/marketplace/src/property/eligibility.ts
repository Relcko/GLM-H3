import { PropertyStatus, type Property } from "@relcko/domain-core";
import type { Money } from "@relcko/types";
import type { EligibilityResult } from "../types";

export interface EligibilityContext {
  readonly tokens: bigint;
  readonly amount: Money;
}

/**
 * Eligibility engine. Encodes the DOMAIN_MODEL.md investment business rules:
 * only ACTIVE properties can be invested in, requested tokens must not exceed
 * available supply, amount must equal tokens * token price, and the amount must
 * satisfy the minimum investment. KYC is required for investment.
 */
export class PropertyEligibilityEngine {
  check(property: Property, ctx: EligibilityContext): EligibilityResult {
    const reasons: string[] = [];

    if (property.status !== PropertyStatus.Active) {
      reasons.push("property is not active for investment");
    }
    if (ctx.tokens <= 0n) {
      reasons.push("tokens must be positive");
    }
    if (ctx.tokens > property.availableTokens) {
      reasons.push("requested tokens exceed available supply");
    }
    const expected = property.tokenPrice.amount * ctx.tokens;
    if (ctx.amount.amount !== expected) {
      reasons.push("amount must equal tokens * token price");
    }
    if (ctx.amount.amount < property.minInvestment.amount) {
      reasons.push("amount is below the minimum investment");
    }

    return { eligible: reasons.length === 0, reasons, requiredKyc: true };
  }
}
