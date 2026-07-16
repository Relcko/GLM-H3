import { z } from "zod";
import {
  addressSchema,
  currencySchema,
  entityIdSchema,
  parseWith,
} from "@relcko/validation";
import {
  AssetType,
  DocumentCategory,
  ListingType,
  PropertyStatus,
} from "@relcko/domain-core";
import { MediaKind } from "./types";

/**
 * Request (DTO) validation schemas for the marketplace. These compose the
 * SHARED primitive schemas from `@relcko/validation` (moneySchema,
 * entityIdSchema, addressSchema, currencySchema) — they never re-declare those
 * primitives, preserving the single-source-of-truth rule. The persisted
 * business entities themselves are validated by the frozen domain-core
 * factories; these schemas validate the caller-supplied inputs only.
 */

export const createPropertySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  assetType: z.nativeEnum(AssetType),
  totalValue: z.number().positive(),
  tokenPrice: z.number().positive(),
  totalTokens: z.bigint().positive(),
  currency: currencySchema,
  expectedRoi: z.number(),
  rentalYield: z.number(),
  appreciationRate: z.number(),
  minInvestment: z.number().positive(),
  blockchain: z.string().min(1),
  contractAddress: addressSchema,
  tokenId: z.string().min(1),
  images: z.array(z.string()).optional(),
  spvId: entityIdSchema.optional(),
});

export const updatePropertySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    expectedRoi: z.number().optional(),
    rentalYield: z.number().optional(),
    appreciationRate: z.number().optional(),
    images: z.array(z.string()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const reserveInvestmentSchema = z.object({
  propertyId: entityIdSchema,
  fractionId: entityIdSchema.optional(),
  tokens: z.bigint().positive(),
  amount: z.number().positive(),
  currency: currencySchema,
  txHash: z.string().optional(),
});

export const createListingSchema = z.object({
  propertyId: entityIdSchema,
  fractionId: entityIdSchema.optional(),
  tokenHoldingId: entityIdSchema,
  listingType: z.nativeEnum(ListingType),
  price: z.number().positive().optional(),
  minBid: z.number().positive().optional(),
  currency: currencySchema,
  quantity: z.bigint().positive(),
  expiresAt: z.string().datetime().optional(),
});

export const completeSaleSchema = z.object({
  buyerId: entityIdSchema,
  totalAmount: z.bigint().positive(),
  platformFeeBps: z.bigint().min(0n).max(10000n),
  currency: currencySchema,
});

export const calculateFeeSchema = z.object({
  totalAmount: z.number().positive(),
  platformFeeRate: z.number().min(0).max(1),
});

export const searchQuerySchema = z.object({
  keyword: z.string().optional(),
  assetType: z.nativeEnum(AssetType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  roiMin: z.number().optional(),
  roiMax: z.number().optional(),
  yieldMin: z.number().optional(),
  yieldMax: z.number().optional(),
  fundingMin: z.number().optional(),
  fundingMax: z.number().optional(),
  minInvestmentMax: z.number().optional(),
  availableOnly: z.boolean().optional(),
  sort: z.enum(["funding", "roi", "yield", "createdAt", "tokenPrice"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().positive().optional(),
});

export const addDocumentSchema = z.object({
  propertyId: entityIdSchema,
  category: z.nativeEnum(DocumentCategory),
  filename: z.string().min(1),
  url: z.string().min(1),
  size: z.number().positive(),
  isPublic: z.boolean().optional(),
});

export const addMediaSchema = z.object({
  propertyId: entityIdSchema,
  kind: z.nativeEnum(MediaKind),
  url: z.string().min(1),
  title: z.string().optional(),
  size: z.number().positive().optional(),
});

export const watchlistSchema = z.object({
  propertyId: entityIdSchema,
  note: z.string().optional(),
});

export const collectionItemSchema = z.object({
  propertyId: entityIdSchema,
});

export function validateCreateProperty(input: unknown) {
  return parseWith(createPropertySchema, input);
}
export function validateUpdateProperty(input: unknown) {
  return parseWith(updatePropertySchema, input);
}
export function validateReserveInvestment(input: unknown) {
  return parseWith(reserveInvestmentSchema, input);
}
export function validateCreateListing(input: unknown) {
  return parseWith(createListingSchema, input);
}
export function validateCompleteSale(input: unknown) {
  return parseWith(completeSaleSchema, input);
}
export function validateSearchQuery(input: unknown) {
  return parseWith(searchQuerySchema, input);
}
export function validateAddDocument(input: unknown) {
  return parseWith(addDocumentSchema, input);
}
export function validateAddMedia(input: unknown) {
  return parseWith(addMediaSchema, input);
}
export function validateWatchlist(input: unknown) {
  return parseWith(watchlistSchema, input);
}
export function validateCollectionItem(input: unknown) {
  return parseWith(collectionItemSchema, input);
}
