import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftAuction, NftBid } from "../types";
import { AuctionStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { NftNotFoundError, AuctionError } from "../errors";

export interface CreateAuctionInput {
  listingId: EntityId;
  nftId: EntityId;
  sellerId: EntityId;
  minBid: Money;
  reservePrice?: Money;
  startPrice: Money;
  startTime: string;
  endTime: string;
}

export interface PlaceBidInput {
  auctionId: EntityId;
  bidderId: EntityId;
  amount: Money;
}

export class AuctionService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateAuctionInput): Promise<NftAuction> {
    const nft = this.repository.getNft(input.nftId);
    if (!nft) throw new NftNotFoundError(input.nftId as string);

    const existing = this.repository.getAuctionByListing(input.listingId);
    if (existing) throw new AuctionError(`Auction already exists for listing ${input.listingId}`);

    const auction: NftAuction = {
      id: generateId("nftauc") as EntityId,
      listingId: input.listingId,
      nftId: input.nftId,
      sellerId: input.sellerId,
      highestBidderId: undefined,
      highestBid: undefined,
      minBid: input.minBid,
      reservePrice: input.reservePrice,
      startPrice: input.startPrice,
      startTime: input.startTime,
      endTime: input.endTime,
      status: AuctionStatus.Pending,
      winnerId: undefined,
      winningBid: undefined,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveAuction(auction);

    await publishNftEvent(this.events, NftEventType.NftAuctionCreated, auction.id, actorId, {
      auctionId: auction.id as string,
      nftId: input.nftId as string,
      minBid: input.minBid.amount.toString(),
      currency: input.minBid.currency,
    });

    this.logger?.info("auction created", { auctionId: auction.id, nftId: input.nftId });

    return auction;
  }

  async placeBid(actorId: EntityId, input: PlaceBidInput): Promise<NftBid> {
    const auction = this.repository.getAuction(input.auctionId);
    if (!auction) throw new AuctionError(`Auction ${input.auctionId} not found`);

    if (auction.status !== AuctionStatus.Active) {
      throw new AuctionError(`Auction ${input.auctionId} is not active`);
    }

    if (input.amount.amount < auction.minBid.amount) {
      throw new AuctionError(`Bid ${input.amount.amount} is below minimum ${auction.minBid.amount}`);
    }

    if (auction.highestBid && input.amount.amount <= auction.highestBid.amount) {
      throw new AuctionError(`Bid ${input.amount.amount} must exceed current highest bid ${auction.highestBid.amount}`);
    }

    const bid: NftBid = {
      id: generateId("nftbid") as EntityId,
      auctionId: input.auctionId,
      bidderId: input.bidderId,
      amount: input.amount,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveBid(bid);

    const updated: NftAuction = {
      ...auction,
      highestBid: input.amount,
      highestBidderId: input.bidderId,
    };
    this.repository.saveAuction(updated);

    await publishNftEvent(this.events, NftEventType.NftAuctionBid, bid.id, actorId, {
      bidId: bid.id as string,
      auctionId: input.auctionId as string,
      bidderId: input.bidderId as string,
      amount: input.amount.amount.toString(),
    });

    this.logger?.info("bid placed", { auctionId: input.auctionId, bidderId: input.bidderId, amount: input.amount.amount.toString() });

    return bid;
  }

  async start(actorId: EntityId, auctionId: EntityId): Promise<NftAuction> {
    const auction = this.repository.getAuction(auctionId);
    if (!auction) throw new AuctionError(`Auction ${auctionId} not found`);

    if (auction.status !== AuctionStatus.Pending) {
      throw new AuctionError(`Auction ${auctionId} is not pending`);
    }

    const started: NftAuction = { ...auction, status: AuctionStatus.Active };
    this.repository.saveAuction(started);
    return started;
  }

  async end(actorId: EntityId, auctionId: EntityId): Promise<NftAuction> {
    const auction = this.repository.getAuction(auctionId);
    if (!auction) throw new AuctionError(`Auction ${auctionId} not found`);

    if (auction.status !== AuctionStatus.Active) {
      throw new AuctionError(`Auction ${auctionId} is not active`);
    }

    const ended: NftAuction = {
      ...auction,
      status: AuctionStatus.Ended,
      winnerId: auction.highestBidderId,
      winningBid: auction.highestBid,
    };
    this.repository.saveAuction(ended);

    await publishNftEvent(this.events, NftEventType.NftAuctionEnded, auctionId, actorId, {
      auctionId: auctionId as string,
      nftId: auction.nftId as string,
      winningBid: String(auction.highestBid?.amount ?? "0"),
      winnerId: auction.highestBidderId as string,
    });

    return ended;
  }

  async cancel(actorId: EntityId, auctionId: EntityId): Promise<NftAuction> {
    const auction = this.repository.getAuction(auctionId);
    if (!auction) throw new AuctionError(`Auction ${auctionId} not found`);

    if (auction.status !== AuctionStatus.Pending && auction.status !== AuctionStatus.Active) {
      throw new AuctionError(`Auction ${auctionId} cannot be cancelled`);
    }

    const cancelled: NftAuction = { ...auction, status: AuctionStatus.Cancelled };
    this.repository.saveAuction(cancelled);

    await publishNftEvent(this.events, NftEventType.NftAuctionCancelled, auctionId, actorId, {
      auctionId: auctionId as string,
    });

    return cancelled;
  }

  getAuction(id: EntityId): NftAuction {
    const auction = this.repository.getAuction(id);
    if (!auction) throw new AuctionError(`Auction ${id} not found`);
    return auction;
  }

  listActive(): NftAuction[] {
    return this.repository.listActiveAuctions();
  }

  listBySeller(sellerId: EntityId): NftAuction[] {
    return this.repository.listAuctionsBySeller(sellerId);
  }

  listBids(auctionId: EntityId): NftBid[] {
    return this.repository.listBidsByAuction(auctionId);
  }
}
