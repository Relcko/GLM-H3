import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftOffer } from "../types";
import { OfferStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { NftNotFoundError, OfferError } from "../errors";

export interface CreateOfferInput {
  nftId: EntityId;
  listingId?: EntityId;
  bidderId: EntityId;
  sellerId: EntityId;
  amount: Money;
  expiresAt?: string;
}

export class OfferService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateOfferInput): Promise<NftOffer> {
    const nft = this.repository.getNft(input.nftId);
    if (!nft) throw new NftNotFoundError(input.nftId as string);

    const offer: NftOffer = {
      id: generateId("nftoff") as EntityId,
      nftId: input.nftId,
      listingId: input.listingId,
      bidderId: input.bidderId,
      sellerId: input.sellerId,
      amount: input.amount,
      status: OfferStatus.Active,
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString(),
      counteredOfferId: undefined,
    };

    this.repository.saveOffer(offer);

    await publishNftEvent(this.events, NftEventType.NftOfferCreated, offer.id, actorId, {
      offerId: offer.id as string,
      nftId: input.nftId as string,
      amount: input.amount.amount.toString(),
      currency: input.amount.currency,
    });

    this.logger?.info("offer created", { offerId: offer.id, nftId: input.nftId, amount: input.amount.amount.toString() });

    return offer;
  }

  async accept(actorId: EntityId, offerId: EntityId): Promise<NftOffer> {
    const offer = this.repository.getOffer(offerId);
    if (!offer) throw new OfferError(`Offer ${offerId} not found`);

    if (offer.status !== OfferStatus.Active) {
      throw new OfferError(`Offer ${offerId} is not active`);
    }

    const accepted: NftOffer = { ...offer, status: OfferStatus.Accepted };
    this.repository.saveOffer(accepted);

    await publishNftEvent(this.events, NftEventType.NftOfferAccepted, offerId, actorId, {
      offerId: offerId as string,
      nftId: offer.nftId as string,
    });

    return accepted;
  }

  async reject(actorId: EntityId, offerId: EntityId): Promise<NftOffer> {
    const offer = this.repository.getOffer(offerId);
    if (!offer) throw new OfferError(`Offer ${offerId} not found`);

    if (offer.status !== OfferStatus.Active) {
      throw new OfferError(`Offer ${offerId} is not active`);
    }

    const rejected: NftOffer = { ...offer, status: OfferStatus.Rejected };
    this.repository.saveOffer(rejected);

    await publishNftEvent(this.events, NftEventType.NftOfferRejected, offerId, actorId, {
      offerId: offerId as string,
      nftId: offer.nftId as string,
    });

    return rejected;
  }

  async cancel(actorId: EntityId, offerId: EntityId): Promise<NftOffer> {
    const offer = this.repository.getOffer(offerId);
    if (!offer) throw new OfferError(`Offer ${offerId} not found`);

    if (offer.status !== OfferStatus.Active) {
      throw new OfferError(`Offer ${offerId} is not active`);
    }

    const cancelled: NftOffer = { ...offer, status: OfferStatus.Cancelled };
    this.repository.saveOffer(cancelled);

    return cancelled;
  }

  getOffer(id: EntityId): NftOffer {
    const offer = this.repository.getOffer(id);
    if (!offer) throw new OfferError(`Offer ${id} not found`);
    return offer;
  }

  listByNft(nftId: EntityId): NftOffer[] {
    return this.repository.listOffersByNft(nftId);
  }

  listByBidder(bidderId: EntityId): NftOffer[] {
    return this.repository.listOffersByBidder(bidderId);
  }

  listBySeller(sellerId: EntityId): NftOffer[] {
    return this.repository.listOffersBySeller(sellerId);
  }
}
