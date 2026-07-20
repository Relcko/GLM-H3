import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftListing } from "../types";
import { ListingType, ListingStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { NftNotFoundError, ListingError } from "../errors";

export interface CreateListingInput {
  nftId: EntityId;
  sellerId: EntityId;
  listingType?: ListingType;
  price: Money;
  minBid?: Money;
  reservePrice?: Money;
  quantity?: bigint;
  expiresAt?: string;
}

export class ListingService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateListingInput): Promise<NftListing> {
    const nft = this.repository.getNft(input.nftId);
    if (!nft) throw new NftNotFoundError(input.nftId as string);

    if (nft.ownerId !== input.sellerId) {
      throw new ListingError(`Seller ${input.sellerId} does not own NFT ${input.nftId}`);
    }

    const activeListings = this.repository.listListingsByNft(input.nftId).filter(l => l.status === ListingStatus.Active);
    if (activeListings.length > 0) {
      throw new ListingError(`NFT ${input.nftId} already has an active listing`);
    }

    const listing: NftListing = {
      id: generateId("nftlst") as EntityId,
      nftId: input.nftId,
      sellerId: input.sellerId,
      listingType: input.listingType ?? ListingType.FixedPrice,
      price: input.price,
      minBid: input.minBid,
      reservePrice: input.reservePrice,
      quantity: input.quantity ?? 1n,
      status: ListingStatus.Active,
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveListing(listing);

    await publishNftEvent(this.events, NftEventType.NftListed, listing.id, actorId, {
      listingId: listing.id as string,
      nftId: input.nftId as string,
      price: input.price.amount.toString(),
      currency: input.price.currency,
    });

    this.logger?.info("listing created", { listingId: listing.id, nftId: input.nftId, price: input.price.amount.toString() });

    return listing;
  }

  async cancel(actorId: EntityId, listingId: EntityId): Promise<NftListing> {
    const listing = this.repository.getListing(listingId);
    if (!listing) throw new ListingError(`Listing ${listingId} not found`);

    if (listing.status !== ListingStatus.Active) {
      throw new ListingError(`Listing ${listingId} is not active`);
    }

    const cancelled: NftListing = { ...listing, status: ListingStatus.Cancelled };
    this.repository.saveListing(cancelled);

    await publishNftEvent(this.events, NftEventType.NftListingCancelled, listingId, actorId, {
      listingId: listingId as string,
    });

    return cancelled;
  }

  getListing(id: EntityId): NftListing {
    const listing = this.repository.getListing(id);
    if (!listing) throw new ListingError(`Listing ${id} not found`);
    return listing;
  }

  listByNft(nftId: EntityId): NftListing[] {
    return this.repository.listListingsByNft(nftId);
  }

  listActive(): NftListing[] {
    return this.repository.listActiveListings();
  }

  listBySeller(sellerId: EntityId): NftListing[] {
    return this.repository.listListingsBySeller(sellerId);
  }
}
