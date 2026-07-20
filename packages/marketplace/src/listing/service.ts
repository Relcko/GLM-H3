import {
  computeAvgCostBasis,
  createListing,
  createOwnership,
  createSale,
  ListingStatus,
  ListingType,
  OwnershipStatus,
  SaleStatus,
  type MarketplaceListing,
  type MarketplaceSale,
  type Ownership,
  type Property,
} from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { decimalsFor, nowIso } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { Action } from "@relcko/permission";
import { MarketplaceAuthorization, type Principal, subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateCompleteSale, validateCreateListing } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { EligibilityError, ListingNotFoundError, PropertyNotFoundError } from "../errors";

/**
 * Listing service. Manages secondary-market listings (Active → Sold / Cancelled
 * / Expired) on the frozen `MarketplaceListing` lifecycle, and settles trades
 * via `MarketplaceSale` while adjusting the frozen `Ownership` records. Every
 * step emits canonical events; the ledger/audit subscribers append immutable
 * transactions.
 */
export class ListingService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(principal: Principal, input: unknown): Promise<MarketplaceListing> {
    const sellerId = subjectId(principal) as EntityId;
    this.auth.assert(principal, Action.ListSell, { ownerId: sellerId });
    const v = validateCreateListing(input);
    const property = this.requireProperty(v.propertyId);
    const fractionId = v.fractionId ?? property.id;
    const holding = this.repository.getOwnership(sellerId, v.propertyId);
    if (!holding || holding.quantity < v.quantity) {
      throw new EligibilityError("Insufficient holding to list", ["quantity exceeds owned tokens"]);
    }
    const listing = createListing({
      sellerId,
      propertyId: v.propertyId,
      fractionId,
      tokenHoldingId: v.tokenHoldingId,
      listingType: v.listingType,
      price: v.price,
      minBid: v.minBid,
      currency: v.currency,
      quantity: v.quantity,
      expiresAt: v.expiresAt,
    });
    this.repository.saveListing(listing);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.ListingCreated, listing.id, sellerId, {
      propertyId: listing.propertyId,
      quantity: listing.quantity.toString(),
      listingType: listing.listingType,
    });
    this.logger?.info("listing created", { listingId: listing.id, propertyId: listing.propertyId });
    return listing;
  }

  async cancel(principal: Principal, id: string): Promise<MarketplaceListing> {
    const listing = this.require(id);
    this.auth.assert(principal, Action.ListSell, { ownerId: listing.sellerId });
    if (listing.status !== ListingStatus.Active) {
      throw new EligibilityError("Only active listings can be cancelled", ["listing not active"]);
    }
    const updated = { ...listing, status: ListingStatus.Cancelled };
    this.repository.saveListing(updated);
    await this.emit(principal, updated, MarketplaceEventType.ListingCancelled);
    return updated;
  }

  async markSold(principal: Principal, id: string): Promise<MarketplaceListing> {
    const listing = this.require(id);
    this.auth.assert(principal, Action.ListSell, { ownerId: listing.sellerId });
    if (listing.status !== ListingStatus.Active) {
      throw new EligibilityError("Only active listings can be marked sold", ["listing not active"]);
    }
    const updated = { ...listing, status: ListingStatus.Sold };
    this.repository.saveListing(updated);
    await this.emit(principal, updated, MarketplaceEventType.ListingSold);
    return updated;
  }

  async expire(principal: Principal, id: string): Promise<MarketplaceListing> {
    const listing = this.require(id);
    this.auth.assert(principal, Action.ListSell, { ownerId: listing.sellerId });
    if (listing.status !== ListingStatus.Active) {
      throw new EligibilityError("Only active listings can be expired", ["listing not active"]);
    }
    const updated = { ...listing, status: ListingStatus.Expired };
    this.repository.saveListing(updated);
    await this.emit(principal, updated, MarketplaceEventType.ListingExpired);
    return updated;
  }

  /** Settle a sale: create the frozen `MarketplaceSale`, adjust ownerships. */
  async completeSale(principal: Principal, listingId: string, input: unknown): Promise<MarketplaceSale> {
    const listing = this.require(listingId);
    this.auth.assert(principal, Action.ListSell, { ownerId: listing.sellerId });
    const v = validateCompleteSale(input);
    if (listing.status !== ListingStatus.Active) {
      throw new EligibilityError("Listing is not active", ["listing not active"]);
    }
    const sellerHolding = this.repository.getOwnership(listing.sellerId, listing.propertyId);
    if (!sellerHolding || sellerHolding.quantity < listing.quantity) {
      throw new EligibilityError("Seller lacks sufficient holdings", ["quantity exceeds holding"]);
    }
    const property = this.requireProperty(listing.propertyId);
    const sale = createSale({
      listingId: listingId as EntityId,
      sellerId: listing.sellerId,
      buyerId: v.buyerId,
      propertyId: listing.propertyId,
      fractionId: listing.fractionId,
      quantity: listing.quantity,
      totalAmount: v.totalAmount,
      platformFeeBps: v.platformFeeBps,
      currency: v.currency,
    });
    const completed: MarketplaceSale = { ...sale, status: SaleStatus.Completed };
    this.repository.saveSale(completed);

    const sellerUpdated = this.decreaseOwnership(sellerHolding, listing.quantity, property);
    this.repository.saveOwnership(sellerUpdated);
    const buyerExisting = this.repository.getOwnership(v.buyerId, listing.propertyId);
    const buyerUpdated = this.increaseOwnership(buyerExisting, listing.quantity, completed, property);
    this.repository.saveOwnership(buyerUpdated);

    const soldListing = { ...listing, status: ListingStatus.Sold };
    this.repository.saveListing(soldListing);

    await publishMarketplaceEvent(this.events, MarketplaceEventType.SaleInitiated, completed.id, subjectId(principal) as EntityId, {
      listingId,
      buyerId: v.buyerId,
      totalAmount: completed.totalAmount.amount.toString(),
    });
    await publishMarketplaceEvent(this.events, MarketplaceEventType.SaleCompleted, completed.id, subjectId(principal) as EntityId, {
      listingId,
      buyerId: v.buyerId,
      sellerReceives: completed.sellerReceives.amount.toString(),
    });
    await this.emit(principal, soldListing, MarketplaceEventType.ListingSold);
    return completed;
  }

  get(id: string): MarketplaceListing {
    return this.require(id);
  }

  listByProperty(propertyId: string): MarketplaceListing[] {
    return this.repository.listListingsByProperty(propertyId as EntityId);
  }

  listBySeller(sellerId: string): MarketplaceListing[] {
    return this.repository.listListingsBySeller(sellerId as EntityId);
  }

  private decreaseOwnership(o: Ownership, qty: bigint, property: Property): Ownership {
    const newQty = o.quantity - qty;
    if (newQty < 0n) throw new EligibilityError("Sale would oversell holding", ["quantity exceeds holding"]);
    const currentValue: Money = { amount: property.tokenPrice.amount * newQty, currency: property.tokenPrice.currency };
    const profitLoss: Money = { amount: currentValue.amount - o.avgCostBasis.amount * newQty, currency: property.tokenPrice.currency };
    const pct = Number((newQty * 10_000n) / property.totalTokens) / 100;
    return {
      ...o,
      quantity: newQty,
      currentValue,
      profitLoss,
      ownershipPercentage: pct,
      status: newQty === 0n ? OwnershipStatus.Zeroed : OwnershipStatus.Decreased,
      updatedAt: nowIso(),
    };
  }

  private increaseOwnership(
    existing: Ownership | undefined,
    qty: bigint,
    sale: MarketplaceSale,
    property: Property,
  ): Ownership {
    const decimals = decimalsFor(property.tokenPrice.currency);
    const priceMajor = Number(property.tokenPrice.amount) / 10 ** decimals;
    if (existing) {
      const avg = computeAvgCostBasis(
        existing.avgCostBasis,
        existing.quantity,
        { amount: property.tokenPrice.amount, currency: property.tokenPrice.currency },
        qty,
      );
      const newQty = existing.quantity + qty;
      const currentValue: Money = { amount: property.tokenPrice.amount * newQty, currency: property.tokenPrice.currency };
      const profitLoss: Money = { amount: currentValue.amount - avg.amount * newQty, currency: property.tokenPrice.currency };
      const pct = Number((newQty * 10_000n) / property.totalTokens) / 100;
      return {
        ...existing,
        quantity: newQty,
        avgCostBasis: avg,
        currentValue,
        profitLoss,
        ownershipPercentage: pct,
        status: OwnershipStatus.Increased,
        updatedAt: nowIso(),
      };
    }
    return createOwnership({
      investorId: sale.buyerId,
      propertyId: property.id,
      fractionId: property.id,
      quantity: qty,
      avgCostBasis: priceMajor,
      currentPrice: priceMajor,
      currency: property.tokenPrice.currency,
      totalSupply: property.totalTokens,
    });
  }

  private async emit(principal: Principal, listing: MarketplaceListing, event: string): Promise<void> {
    await publishMarketplaceEvent(this.events, event, listing.id, subjectId(principal) as EntityId, {
      propertyId: listing.propertyId,
      status: listing.status,
    });
  }

  private require(id: string): MarketplaceListing {
    const listing = this.repository.getListing(id as EntityId);
    if (!listing) throw new ListingNotFoundError(id);
    return listing;
  }

  private requireProperty(id: string): Property {
    const p = this.repository.getProperty(id as EntityId);
    if (!p) throw new PropertyNotFoundError(id);
    return p;
  }
}
