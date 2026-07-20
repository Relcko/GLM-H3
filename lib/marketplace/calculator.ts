/**
 * Investment calculator — pure UI math for the Investment Panel.
 *
 * All inputs are expressed in MAJOR units (e.g. 100 = 100 USDT) and token
 * counts are bigints. This module contains no business rules of its own; it
 * mirrors the eligibility contract enforced by the backend
 * (`PropertyEligibilityEngine`: amount === tokenPrice * tokens, and
 * amount >= minInvestment).
 */

export interface InvestmentBreakdown {
  readonly tokens: bigint;
  readonly amount: number;
  readonly tokenPrice: number;
  readonly valid: boolean;
  readonly remainingToMin: number;
}

export interface ExpectedReturns {
  readonly annualRental: number;
  readonly annualAppreciation: number;
  readonly totalAnnual: number;
  readonly totalPct: number;
}

/** Tokens purchasable for a given major-unit amount at a token price. */
export function tokensFromAmount(amountMajor: number, tokenPriceMajor: number): bigint {
  if (tokenPriceMajor <= 0) return 0n;
  return BigInt(Math.floor(amountMajor / tokenPriceMajor));
}

/** Major-unit cost of a whole number of tokens at a token price. */
export function amountFromTokens(tokens: bigint, tokenPriceMajor: number): number {
  return Number(tokens) * tokenPriceMajor;
}

/** Validate an amount against token price and minimum investment. */
export function breakdown(
  amountMajor: number,
  tokenPriceMajor: number,
  minInvestmentMajor: number,
): InvestmentBreakdown {
  const tokens = tokensFromAmount(amountMajor, tokenPriceMajor);
  const amount = amountFromTokens(tokens, tokenPriceMajor);
  const valid = tokens > 0n && amount >= minInvestmentMajor && amountMajor >= minInvestmentMajor;
  const remainingToMin = Math.max(0, minInvestmentMajor - amount);
  return { tokens, amount, tokenPrice: tokenPriceMajor, valid, remainingToMin };
}

/** Expected annual returns from rental yield + appreciation on the invested amount. */
export function expectedReturns(
  tokens: bigint,
  tokenPriceMajor: number,
  rentalYieldPct: number,
  appreciationRatePct: number,
): ExpectedReturns {
  const invested = amountFromTokens(tokens, tokenPriceMajor);
  const annualRental = invested * (rentalYieldPct / 100);
  const annualAppreciation = invested * (appreciationRatePct / 100);
  const totalAnnual = annualRental + annualAppreciation;
  const totalPct = rentalYieldPct + appreciationRatePct;
  return { annualRental, annualAppreciation, totalAnnual, totalPct };
}

/** Human-readable eligibility reasons (empty array means eligible). */
export function eligibilityReasons(
  amountMajor: number,
  tokenPriceMajor: number,
  minInvestmentMajor: number,
): string[] {
  const reasons: string[] = [];
  if (amountMajor <= 0) {
    reasons.push("Enter an investment amount greater than zero.");
    return reasons;
  }
  const tokens = tokensFromAmount(amountMajor, tokenPriceMajor);
  if (tokens === 0n) {
    reasons.push(`The minimum is one fraction (${tokenPriceMajor} per token).`);
  }
  if (amountMajor < minInvestmentMajor) {
    reasons.push(`Minimum investment is ${minInvestmentMajor} — increase your amount.`);
  }
  const exact = amountFromTokens(tokens, tokenPriceMajor);
  if (tokens > 0n && exact !== amountMajor) {
    reasons.push(`Adjusted to ${exact} for a whole number of fractions.`);
  }
  return reasons;
}
