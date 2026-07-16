import { ValidationError } from "@relcko/error";
import { z } from "zod";
import type {
  Agent,
  AuditLog,
  Commission,
  Documents,
  Investment,
  Investor,
  KYC,
  MarketplaceListing,
  MarketplaceSale,
  Ownership,
  Payment,
  Portfolio,
  Property,
  PropertyFraction,
  Referral,
  RewardSchedule,
  SPV,
  Transaction,
  Wallet,
} from "@relcko/domain-core";
import * as schemas from "./domain";

/** Validate `data` against `schema`, throwing a typed ValidationError on failure. */
export function parseWith<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      "Validation failed",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      "VALIDATION_FAILED",
    );
  }
  return result.data;
}

export const parseProperty = (d: unknown): Property => parseWith(schemas.propertySchema, d);
export const parsePropertyFraction = (d: unknown): PropertyFraction => parseWith(schemas.propertyFractionSchema, d);
export const parseSpv = (d: unknown): SPV => parseWith(schemas.spvSchema, d);
export const parseInvestment = (d: unknown): Investment => parseWith(schemas.investmentSchema, d);
export const parseMarketplaceListing = (d: unknown): MarketplaceListing =>
  parseWith(schemas.marketplaceListingSchema, d);
export const parseMarketplaceSale = (d: unknown): MarketplaceSale => parseWith(schemas.marketplaceSaleSchema, d);
export const parseOwnership = (d: unknown): Ownership => parseWith(schemas.ownershipSchema, d);
export const parsePortfolio = (d: unknown): Portfolio => parseWith(schemas.portfolioSchema, d);
export const parseInvestor = (d: unknown): Investor => parseWith(schemas.investorSchema, d);
export const parseAgent = (d: unknown): Agent => parseWith(schemas.agentSchema, d);
export const parseWallet = (d: unknown): Wallet => parseWith(schemas.walletSchema, d);
export const parseKyc = (d: unknown): KYC => parseWith(schemas.kycSchema, d);
export const parseReferral = (d: unknown): Referral => parseWith(schemas.referralSchema, d);
export const parseCommission = (d: unknown): Commission => parseWith(schemas.commissionSchema, d);
export const parseTransaction = (d: unknown): Transaction => parseWith(schemas.transactionSchema, d);
export const parsePayment = (d: unknown): Payment => parseWith(schemas.paymentSchema, d);
export const parseAuditLog = (d: unknown): AuditLog => parseWith(schemas.auditLogSchema, d);
export const parseDocument = (d: unknown): Documents => parseWith(schemas.documentSchema, d);
export const parseRewardSchedule = (d: unknown): RewardSchedule => parseWith(schemas.rewardScheduleSchema, d);

export * from "./primitives";
export * from "./domain";
export { ValidationError } from "@relcko/error";
