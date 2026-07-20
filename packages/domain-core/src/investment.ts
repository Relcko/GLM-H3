import { DomainError } from "@relcko/error";
import type { Currency, EntityId, Money, TxHash } from "@relcko/types";
import { asTxHash } from "@relcko/types";
import { generateId, money } from "@relcko/utils";
import { assertTransition, transition } from "./state-machine";

export enum InvestmentStatus {
  Pending = "pending",
  Processing = "processing",
  Confirmed = "confirmed",
  Failed = "failed",
  Refunded = "refunded",
}

const INVESTMENT_TRANSITIONS: Readonly<Record<InvestmentStatus, readonly InvestmentStatus[]>> = {
  [InvestmentStatus.Pending]: [InvestmentStatus.Processing, InvestmentStatus.Failed],
  [InvestmentStatus.Processing]: [InvestmentStatus.Confirmed, InvestmentStatus.Failed],
  [InvestmentStatus.Confirmed]: [],
  [InvestmentStatus.Failed]: [InvestmentStatus.Refunded],
  [InvestmentStatus.Refunded]: [],
};

export interface Investment {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly fractionId: EntityId;
  readonly tokens: bigint;
  readonly amount: Money;
  readonly currency: Currency;
  readonly txHash?: TxHash;
  readonly status: InvestmentStatus;
  readonly createdAt: string;
  readonly kycVerified: boolean;
}

export function assertInvestmentInvariants(i: Investment): void {
  if (i.tokens <= 0n) throw new DomainError("tokens must be > 0", "INVESTMENT_TOKENS", { id: i.id });
  if (i.amount.amount <= 0n) throw new DomainError("amount must be > 0", "INVESTMENT_AMOUNT", { id: i.id });
  if (i.status === InvestmentStatus.Confirmed && !i.kycVerified)
    throw new DomainError("confirmed investment requires KYC", "INVESTMENT_KYC", { id: i.id });
}

export function createInvestment(input: {
  investorId: EntityId;
  propertyId: EntityId;
  fractionId: EntityId;
  tokens: bigint;
  amount: number;
  currency: Currency;
  txHash?: string;
  kycVerified?: boolean;
}): Investment {
  const investment: Investment = {
    id: generateId("inv"),
    investorId: input.investorId,
    propertyId: input.propertyId,
    fractionId: input.fractionId,
    tokens: input.tokens,
    amount: money(input.amount, input.currency),
    currency: input.currency,
    txHash: input.txHash ? asTxHash(input.txHash) : undefined,
    status: InvestmentStatus.Pending,
    createdAt: new Date().toISOString(),
    kycVerified: input.kycVerified ?? false,
  };
  assertInvestmentInvariants(investment);
  return investment;
}

export function transitionInvestment(i: Investment, next: InvestmentStatus): Investment {
  const status = transition(INVESTMENT_TRANSITIONS, i.status, next, "Investment");
  return { ...i, status };
}

export enum ListingType {
  Fixed = "fixed",
  Auction = "auction",
}

export enum ListingStatus {
  Active = "active",
  Sold = "sold",
  Cancelled = "cancelled",
  Expired = "expired",
}

export interface MarketplaceListing {
  readonly id: EntityId;
  readonly sellerId: EntityId;
  readonly propertyId: EntityId;
  readonly fractionId: EntityId;
  readonly tokenHoldingId: EntityId;
  readonly listingType: ListingType;
  readonly price?: Money;
  readonly minBid?: Money;
  readonly currentPrice?: Money;
  readonly quantity: bigint;
  readonly status: ListingStatus;
  readonly expiresAt?: string;
  readonly createdAt: string;
}

export function assertListingInvariants(l: MarketplaceListing): void {
  if (l.quantity <= 0n) throw new DomainError("quantity must be > 0", "LISTING_QUANTITY", { id: l.id });
  if (l.listingType === ListingType.Fixed && (!l.price || l.price.amount <= 0n))
    throw new DomainError("fixed listing requires positive price", "LISTING_PRICE", { id: l.id });
  if (l.listingType === ListingType.Auction && (!l.minBid || l.minBid.amount <= 0n))
    throw new DomainError("auction listing requires positive minBid", "LISTING_MIN_BID", { id: l.id });
}

export function createListing(input: {
  sellerId: EntityId;
  propertyId: EntityId;
  fractionId: EntityId;
  tokenHoldingId: EntityId;
  listingType: ListingType;
  price?: number;
  minBid?: number;
  currency: Currency;
  quantity: bigint;
  expiresAt?: string;
}): MarketplaceListing {
  const listing: MarketplaceListing = {
    id: generateId("list"),
    sellerId: input.sellerId,
    propertyId: input.propertyId,
    fractionId: input.fractionId,
    tokenHoldingId: input.tokenHoldingId,
    listingType: input.listingType,
    price: input.price !== undefined ? money(input.price, input.currency) : undefined,
    minBid: input.minBid !== undefined ? money(input.minBid, input.currency) : undefined,
    currentPrice: input.price !== undefined ? money(input.price, input.currency) : undefined,
    quantity: input.quantity,
    status: ListingStatus.Active,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
  };
  assertListingInvariants(listing);
  return listing;
}

export enum SaleStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
  Refunded = "refunded",
}

export interface MarketplaceSale {
  readonly id: EntityId;
  readonly listingId: EntityId;
  readonly bidId?: EntityId;
  readonly sellerId: EntityId;
  readonly buyerId: EntityId;
  readonly propertyId: EntityId;
  readonly fractionId: EntityId;
  readonly quantity: bigint;
  readonly totalAmount: Money;
  readonly platformFee: Money;
  readonly sellerReceives: Money;
  readonly txHash?: TxHash;
  readonly status: SaleStatus;
  readonly createdAt: string;
}

export function assertSaleInvariants(s: MarketplaceSale): void {
  if (s.buyerId === s.sellerId) throw new DomainError("buyer cannot equal seller", "SALE_SELF_TRADE", { id: s.id });
  if (s.totalAmount.amount <= 0n) throw new DomainError("totalAmount must be > 0", "SALE_AMOUNT", { id: s.id });
  const fee = s.totalAmount.currency === s.platformFee.currency ? s.platformFee.amount : 0n;
  const recv = s.totalAmount.currency === s.sellerReceives.currency ? s.sellerReceives.amount : 0n;
  if (fee + recv !== s.totalAmount.amount)
    throw new DomainError("sellerReceives + platformFee must equal totalAmount", "SALE_FEE_MISMATCH", { id: s.id });
}

export function createSale(input: {
  listingId: EntityId;
  bidId?: EntityId;
  sellerId: EntityId;
  buyerId: EntityId;
  propertyId: EntityId;
  fractionId: EntityId;
  quantity: bigint;
  totalAmount: bigint;
  platformFeeBps: bigint;
  currency: Currency;
  txHash?: string;
}): MarketplaceSale {
  const total = money(input.totalAmount, input.currency);
  const feeAmount = (input.totalAmount * input.platformFeeBps) / 10000n;
  const fee = money(feeAmount, input.currency);
  const sale: MarketplaceSale = {
    id: generateId("sale"),
    listingId: input.listingId,
    bidId: input.bidId,
    sellerId: input.sellerId,
    buyerId: input.buyerId,
    propertyId: input.propertyId,
    fractionId: input.fractionId,
    quantity: input.quantity,
    totalAmount: total,
    platformFee: fee,
    sellerReceives: money(input.totalAmount - feeAmount, input.currency),
    txHash: input.txHash ? asTxHash(input.txHash) : undefined,
    status: SaleStatus.Pending,
    createdAt: new Date().toISOString(),
  };
  assertSaleInvariants(sale);
  return sale;
}

export enum OwnershipStatus {
  Created = "created",
  Increased = "increased",
  Decreased = "decreased",
  Zeroed = "zeroed",
}

export interface Ownership {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly fractionId: EntityId;
  readonly quantity: bigint;
  readonly avgCostBasis: Money;
  readonly currentValue: Money;
  readonly profitLoss: Money;
  readonly ownershipPercentage: number;
  readonly status: OwnershipStatus;
  readonly updatedAt: string;
}

/** Single shared weighted-average cost-basis computation (legacy duplicated 3x). */
export function computeAvgCostBasis(
  current: Money,
  currentQty: bigint,
  acquisitionCost: Money,
  acquisitionQty: bigint,
): Money {
  if (acquisitionQty <= 0n) return current;
  const totalQty = currentQty + acquisitionQty;
  if (totalQty <= 0n) return current;
  const totalCost = current.amount * currentQty + acquisitionCost.amount * acquisitionQty;
  return { amount: totalCost / totalQty, currency: current.currency };
}

export function createOwnership(input: {
  investorId: EntityId;
  propertyId: EntityId;
  fractionId: EntityId;
  quantity: bigint;
  avgCostBasis: number;
  currentPrice: number;
  currency: Currency;
  totalSupply: bigint;
}): Ownership {
  const qty = input.quantity;
  const cost = money(input.avgCostBasis, input.currency);
  const currentValue = money(input.currentPrice, input.currency);
  return {
    id: generateId("own"),
    investorId: input.investorId,
    propertyId: input.propertyId,
    fractionId: input.fractionId,
    quantity: qty,
    avgCostBasis: cost,
    currentValue: { amount: currentValue.amount * qty, currency: input.currency },
    profitLoss: { amount: (currentValue.amount - cost.amount) * qty, currency: input.currency },
    ownershipPercentage: Number((qty * 10_000n) / input.totalSupply) / 10_000,
    status: OwnershipStatus.Created,
    updatedAt: new Date().toISOString(),
  };
}

export interface PortfolioHolding {
  readonly propertyId: EntityId;
  readonly quantity: bigint;
  readonly value: Money;
  readonly profitLoss: Money;
}

/** Read-model aggregate (not stored). Derived values must reconcile with ledger. */
export interface Portfolio {
  readonly investorId: EntityId;
  readonly totalInvested: Money;
  readonly totalCurrentValue: Money;
  readonly totalProfitLoss: Money;
  readonly profitLossPct: number;
  readonly holdings: readonly PortfolioHolding[];
  readonly computedAt: string;
}

export function computePortfolio(investorId: EntityId, holdings: readonly PortfolioHolding[]): Portfolio {
  let invested = 0n;
  let value = 0n;
  let pnl = 0n;
  const currency = holdings[0]?.value.currency;
  for (const h of holdings) {
    invested += h.value.amount - h.profitLoss.amount;
    value += h.value.amount;
    pnl += h.profitLoss.amount;
  }
  if (currency === undefined) {
    throw new DomainError("Portfolio requires at least one holding", "PORTFOLIO_EMPTY", { investorId });
  }
  const profitLossPct = invested === 0n ? 0 : (Number(pnl) / Number(invested)) * 100;
  return {
    investorId,
    totalInvested: { amount: invested, currency },
    totalCurrentValue: { amount: value, currency },
    totalProfitLoss: { amount: pnl, currency },
    profitLossPct,
    holdings,
    computedAt: new Date().toISOString(),
  };
}
