import { z } from "zod";

export class NftValidator {
  static collectionName = z.string().min(1).max(128);
  static collectionSymbol = z.string().min(1).max(16);
  static description = z.string().max(2000);
  static tokenId = z.string().min(1).max(256);
  static metadataUri = z.string().url().or(z.string().startsWith("ipfs://"));
  static url = z.string().url().or(z.string().startsWith("ipfs://"));
  static bps = z.number().int().min(0).max(10000);
  static entityId = z.string().min(1);
}

export const ValidationSchema = {
  createCollection: z.object({
    name: NftValidator.collectionName,
    symbol: NftValidator.collectionSymbol,
    description: NftValidator.description,
    creatorId: NftValidator.entityId,
    metadataUri: NftValidator.metadataUri,
  }),
  mint: z.object({
    collectionId: NftValidator.entityId,
    creatorId: NftValidator.entityId,
    ownerId: NftValidator.entityId,
    supply: z.bigint().positive().default(1n),
    name: NftValidator.collectionName,
    description: NftValidator.description,
    image: NftValidator.url,
  }),
  createListing: z.object({
    nftId: NftValidator.entityId,
    sellerId: NftValidator.entityId,
    price: z.bigint().nonnegative(),
    expiresAt: z.string().datetime().optional(),
  }),
  createOffer: z.object({
    nftId: NftValidator.entityId,
    bidderId: NftValidator.entityId,
    sellerId: NftValidator.entityId,
    amount: z.bigint().nonnegative(),
    expiresAt: z.string().datetime().optional(),
  }),
};
