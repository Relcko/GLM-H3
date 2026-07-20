import { z } from "zod";
import {
  AgentStatus,
  AssetType,
  CommissionStatus,
  DocumentCategory,
  FractionStatus,
  InvestmentStatus,
  InvestorStatus,
  KycStatus,
  ListingStatus,
  ListingType,
  OwnershipStatus,
  PaymentStatus,
  PropertyStatus,
  ReferralStatus,
  RewardStatus,
  SaleStatus,
  SpvStatus,
  TransactionStatus,
  TransactionType,
} from "@relcko/domain-core";
import { PaymentMethod } from "@relcko/types";
import {
  addressSchema,
  chainIdSchema,
  currencySchema,
  entityIdSchema,
  moneySchema,
  timestampSchema,
  txHashSchema,
} from "./primitives";

const stringArray = z.array(z.string());

export const propertySchema = z.object({
  id: entityIdSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  location: z.string().min(1),
  assetType: z.nativeEnum(AssetType),
  totalValue: moneySchema,
  tokenPrice: moneySchema,
  totalTokens: z.bigint().positive(),
  availableTokens: z.bigint().nonnegative(),
  soldTokens: z.bigint().nonnegative(),
  expectedRoi: z.number(),
  rentalYield: z.number(),
  appreciationRate: z.number(),
  minInvestment: moneySchema,
  blockchain: z.string().min(1),
  contractAddress: addressSchema,
  tokenId: z.string().min(1),
  status: z.nativeEnum(PropertyStatus),
  images: stringArray,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  spvId: entityIdSchema.optional(),
});

export const propertyFractionSchema = z.object({
  id: entityIdSchema,
  propertyId: entityIdSchema,
  tokenId: z.string().min(1),
  standard: z.string().min(1),
  totalSupply: z.bigint().positive(),
  availableSupply: z.bigint().nonnegative(),
  pricePerToken: moneySchema,
  paymentToken: addressSchema,
  paymentTokenDecimals: z.number().int().nonnegative(),
  metadataUri: z.string().min(1),
  isActive: z.boolean(),
  paused: z.boolean(),
  status: z.nativeEnum(FractionStatus),
  createdAt: timestampSchema,
});

export const spvSchema = z.object({
  id: entityIdSchema,
  propertyId: entityIdSchema,
  legalName: z.string().min(1),
  jurisdiction: z.string().min(1),
  registrationNumber: z.string().min(1),
  governingDocumentUrl: z.string().min(1),
  bankAccountRef: z.string().min(1),
  status: z.nativeEnum(SpvStatus),
  formedAt: timestampSchema,
  dissolvedAt: timestampSchema.optional(),
});

export const investmentSchema = z.object({
  id: entityIdSchema,
  investorId: entityIdSchema,
  propertyId: entityIdSchema,
  fractionId: entityIdSchema,
  tokens: z.bigint().positive(),
  amount: moneySchema,
  currency: currencySchema,
  txHash: txHashSchema.optional(),
  status: z.nativeEnum(InvestmentStatus),
  createdAt: timestampSchema,
  kycVerified: z.boolean(),
});

export const marketplaceListingSchema = z.object({
  id: entityIdSchema,
  sellerId: entityIdSchema,
  propertyId: entityIdSchema,
  fractionId: entityIdSchema,
  tokenHoldingId: entityIdSchema,
  listingType: z.nativeEnum(ListingType),
  price: moneySchema.optional(),
  minBid: moneySchema.optional(),
  currentPrice: moneySchema.optional(),
  quantity: z.bigint().positive(),
  status: z.nativeEnum(ListingStatus),
  expiresAt: timestampSchema.optional(),
  createdAt: timestampSchema,
});

export const marketplaceSaleSchema = z.object({
  id: entityIdSchema,
  listingId: entityIdSchema,
  bidId: entityIdSchema.optional(),
  sellerId: entityIdSchema,
  buyerId: entityIdSchema,
  propertyId: entityIdSchema,
  fractionId: entityIdSchema,
  quantity: z.bigint().positive(),
  totalAmount: moneySchema,
  platformFee: moneySchema,
  sellerReceives: moneySchema,
  txHash: txHashSchema.optional(),
  status: z.nativeEnum(SaleStatus),
  createdAt: timestampSchema,
});

export const ownershipSchema = z.object({
  id: entityIdSchema,
  investorId: entityIdSchema,
  propertyId: entityIdSchema,
  fractionId: entityIdSchema,
  quantity: z.bigint().nonnegative(),
  avgCostBasis: moneySchema,
  currentValue: moneySchema,
  profitLoss: moneySchema,
  ownershipPercentage: z.number().min(0).max(100),
  status: z.nativeEnum(OwnershipStatus),
  updatedAt: timestampSchema,
});

export const portfolioHoldingSchema = z.object({
  propertyId: entityIdSchema,
  quantity: z.bigint().nonnegative(),
  value: moneySchema,
  profitLoss: moneySchema,
});

export const portfolioSchema = z.object({
  investorId: entityIdSchema,
  totalInvested: moneySchema,
  totalCurrentValue: moneySchema,
  totalProfitLoss: moneySchema,
  profitLossPct: z.number(),
  holdings: z.array(portfolioHoldingSchema),
  computedAt: timestampSchema,
});

export const investorSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  walletAddress: addressSchema.optional(),
  status: z.nativeEnum(InvestorStatus),
  isAdmin: z.boolean(),
  kycStatus: z.nativeEnum(KycStatus),
  createdAt: timestampSchema,
});

export const agentSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  code: z.string().regex(/^[A-Za-z0-9_-]{4,32}$/),
  status: z.nativeEnum(AgentStatus),
  commissionRate: z.number().min(0).max(100),
  totalEarnings: moneySchema,
  withdrawnEarnings: moneySchema,
  createdAt: timestampSchema,
});

export const walletSchema = z.object({
  id: entityIdSchema,
  investorId: entityIdSchema,
  address: addressSchema,
  chainId: chainIdSchema,
  verified: z.boolean(),
  linkedAt: timestampSchema,
});

export const kycSchema = z.object({
  id: entityIdSchema,
  investorId: entityIdSchema,
  documentRefs: stringArray,
  status: z.nativeEnum(KycStatus),
  submittedAt: timestampSchema.optional(),
  reviewedAt: timestampSchema.optional(),
  verifierId: entityIdSchema.optional(),
});

export const referralSchema = z.object({
  id: entityIdSchema,
  agentId: entityIdSchema,
  referredUserId: entityIdSchema,
  code: z.string().min(1),
  status: z.nativeEnum(ReferralStatus),
  createdAt: timestampSchema,
});

export const commissionSchema = z.object({
  id: entityIdSchema,
  agentId: entityIdSchema,
  referralId: entityIdSchema,
  userId: entityIdSchema,
  commissionableType: z.enum(["investment", "marketplace_sale"]),
  commissionableId: entityIdSchema,
  transactionType: z.enum(["primary_purchase", "secondary_buy", "secondary_sell"]),
  amount: moneySchema,
  rate: z.number().min(0).max(100),
  status: z.nativeEnum(CommissionStatus),
  createdAt: timestampSchema,
});

export const transactionSchema = z.object({
  id: entityIdSchema,
  investorId: entityIdSchema,
  propertyId: entityIdSchema.optional(),
  investmentId: entityIdSchema.optional(),
  saleId: entityIdSchema.optional(),
  type: z.nativeEnum(TransactionType),
  amount: moneySchema,
  currency: currencySchema,
  txHash: txHashSchema.optional(),
  status: z.nativeEnum(TransactionStatus),
  timestamp: timestampSchema,
});

export const paymentSchema = z.object({
  id: entityIdSchema,
  payerId: entityIdSchema,
  payeeId: entityIdSchema,
  amount: moneySchema,
  currency: currencySchema,
  method: z.nativeEnum(PaymentMethod),
  txHash: txHashSchema.optional(),
  status: z.nativeEnum(PaymentStatus),
  relatedInvestmentId: entityIdSchema.optional(),
  relatedSaleId: entityIdSchema.optional(),
  relatedWithdrawalId: entityIdSchema.optional(),
  createdAt: timestampSchema,
});

export const auditLogSchema = z.object({
  id: entityIdSchema,
  actorId: entityIdSchema,
  action: z.string().min(1),
  entityType: z.enum([
    "investment",
    "marketplace_sale",
    "ownership",
    "kyc",
    "commission",
    "agent",
    "payment",
    "wallet",
    "property",
    "spv",
    "document",
    "referral",
  ]),
  entityId: entityIdSchema,
  before: z.record(z.unknown()).optional(),
  after: z.record(z.unknown()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: timestampSchema,
});

export const documentSchema = z.object({
  id: entityIdSchema,
  propertyId: entityIdSchema.optional(),
  investorId: entityIdSchema.optional(),
  uploaderId: entityIdSchema,
  category: z.nativeEnum(DocumentCategory),
  filename: z.string().min(1),
  url: z.string().min(1),
  size: z.number().positive(),
  isPublic: z.boolean(),
  uploadedAt: timestampSchema,
});

export const rewardScheduleSchema = z.object({
  id: entityIdSchema,
  propertyId: entityIdSchema,
  period: z.string().min(1),
  totalAmount: moneySchema,
  perTokenAmount: moneySchema,
  currency: currencySchema,
  status: z.nativeEnum(RewardStatus),
  createdAt: timestampSchema,
});
