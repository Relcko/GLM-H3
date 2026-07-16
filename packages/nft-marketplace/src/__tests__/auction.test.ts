import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNftRepository } from "../in-memory-repository";
import { AuctionService } from "../auction/service";
import { MintService } from "../mint/service";
import { CollectionService } from "../collection/service";
import { NftStandard, NftType, AuctionStatus } from "../types";

describe("AuctionService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let auctionService: AuctionService;
  let mintService: MintService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const sellerId = "seller-1" as never;
  const bidderId = "bidder-1" as never;
  let nftId: string;
  const listingId = "listing-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    auctionService = new AuctionService(repository, events);
    mintService = new MintService(repository, events);
    collectionService = new CollectionService(repository, events);

    const collection = await collectionService.create(actorId, {
      name: "Auction Test",
      symbol: "AUC",
      description: "Auction test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/auc",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId: sellerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Auction NFT",
      description: "Auction target",
      image: "ipfs://nft/auc",
    });
    nftId = nft.id as string;
  });

  it("creates an auction", async () => {
    const auction = await auctionService.create(actorId, {
      listingId,
      nftId: nftId as never,
      sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(auction.status).toBe(AuctionStatus.Pending);
    expect(auction.minBid.amount).toBe(10n);
  });

  it("starts an auction", async () => {
    const auction = await auctionService.create(actorId, {
      listingId,
      nftId: nftId as never,
      sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    const started = await auctionService.start(actorId, auction.id);
    expect(started.status).toBe(AuctionStatus.Active);
  });

  it("places a bid on an active auction", async () => {
    const auction = await auctionService.create(actorId, {
      listingId, nftId: nftId as never, sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    await auctionService.start(actorId, auction.id);

    const bid = await auctionService.placeBid(actorId, {
      auctionId: auction.id,
      bidderId,
      amount: { amount: 20n, currency: Currency.USDT },
    });

    expect(bid.amount.amount).toBe(20n);

    const updated = auctionService.getAuction(auction.id);
    expect(updated.highestBid?.amount).toBe(20n);
    expect(updated.highestBidderId).toBe(bidderId);
  });

  it("rejects bid below min bid", async () => {
    const auction = await auctionService.create(actorId, {
      listingId, nftId: nftId as never, sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    await auctionService.start(actorId, auction.id);

    await expect(auctionService.placeBid(actorId, {
      auctionId: auction.id,
      bidderId,
      amount: { amount: 5n, currency: Currency.USDT },
    })).rejects.toThrow("below minimum");
  });

  it("ends an auction and sets winner", async () => {
    const auction = await auctionService.create(actorId, {
      listingId, nftId: nftId as never, sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    await auctionService.start(actorId, auction.id);
    await auctionService.placeBid(actorId, {
      auctionId: auction.id, bidderId, amount: { amount: 20n, currency: Currency.USDT },
    });

    const ended = await auctionService.end(actorId, auction.id);
    expect(ended.status).toBe(AuctionStatus.Ended);
    expect(ended.winnerId).toBe(bidderId);
  });

  it("cancels an auction", async () => {
    const auction = await auctionService.create(actorId, {
      listingId, nftId: nftId as never, sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    const cancelled = await auctionService.cancel(actorId, auction.id);
    expect(cancelled.status).toBe(AuctionStatus.Cancelled);
  });

  it("lists bids for an auction", async () => {
    const auction = await auctionService.create(actorId, {
      listingId, nftId: nftId as never, sellerId,
      minBid: { amount: 10n, currency: Currency.USDT },
      startPrice: { amount: 10n, currency: Currency.USDT },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
    });

    await auctionService.start(actorId, auction.id);
    await auctionService.placeBid(actorId, {
      auctionId: auction.id, bidderId, amount: { amount: 20n, currency: Currency.USDT },
    });

    const bids = auctionService.listBids(auction.id);
    expect(bids).toHaveLength(1);
  });
});
