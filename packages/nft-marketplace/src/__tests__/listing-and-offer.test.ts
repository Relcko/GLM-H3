import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNftRepository } from "../in-memory-repository";
import { ListingService } from "../listing/service";
import { OfferService } from "../offer/service";
import { MintService } from "../mint/service";
import { CollectionService } from "../collection/service";
import { NftStandard, NftType, ListingStatus, OfferStatus } from "../types";

describe("ListingService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let listingService: ListingService;
  let mintService: MintService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const sellerId = "seller-1" as never;
  let nftId: string;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    listingService = new ListingService(repository, events);
    mintService = new MintService(repository, events);
    collectionService = new CollectionService(repository, events);

    const collection = await collectionService.create(actorId, {
      name: "Listing Test",
      symbol: "LST",
      description: "Listing test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/lst",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId: sellerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Listing NFT",
      description: "To be listed",
      image: "ipfs://nft/lst",
    });
    nftId = nft.id as string;
  });

  it("creates a fixed-price listing", async () => {
    const listing = await listingService.create(actorId, {
      nftId: nftId as never,
      sellerId,
      price: { amount: 100n, currency: Currency.USDT },
    });

    expect(listing.nftId as string).toBe(nftId);
    expect(listing.price?.amount).toBe(100n);
    expect(listing.status).toBe(ListingStatus.Active);
  });

  it("rejects listing by non-owner", async () => {
    await expect(listingService.create(actorId, {
      nftId: nftId as never,
      sellerId: "not-owner" as never,
      price: { amount: 100n, currency: Currency.USDT },
    })).rejects.toThrow("does not own");
  });

  it("rejects duplicate active listing", async () => {
    await listingService.create(actorId, {
      nftId: nftId as never,
      sellerId,
      price: { amount: 100n, currency: Currency.USDT },
    });

    await expect(listingService.create(actorId, {
      nftId: nftId as never,
      sellerId,
      price: { amount: 200n, currency: Currency.USDT },
    })).rejects.toThrow("already has an active listing");
  });

  it("cancels an active listing", async () => {
    const listing = await listingService.create(actorId, {
      nftId: nftId as never,
      sellerId,
      price: { amount: 100n, currency: Currency.USDT },
    });

    const cancelled = await listingService.cancel(actorId, listing.id);
    expect(cancelled.status).toBe(ListingStatus.Cancelled);
  });
});

describe("OfferService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let offerService: OfferService;
  let mintService: MintService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const sellerId = "seller-1" as never;
  const bidderId = "bidder-1" as never;
  let nftId: string;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    offerService = new OfferService(repository, events);
    mintService = new MintService(repository, events);
    collectionService = new CollectionService(repository, events);

    const collection = await collectionService.create(actorId, {
      name: "Offer Test",
      symbol: "OFR",
      description: "Offer test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/ofr",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId: sellerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Offer NFT",
      description: "Offer target",
      image: "ipfs://nft/ofr",
    });
    nftId = nft.id as string;
  });

  it("creates an offer", async () => {
    const offer = await offerService.create(actorId, {
      nftId: nftId as never,
      bidderId,
      sellerId,
      amount: { amount: 50n, currency: Currency.USDT },
    });

    expect(offer.amount.amount).toBe(50n);
    expect(offer.status).toBe(OfferStatus.Active);
  });

  it("accepts an offer", async () => {
    const offer = await offerService.create(actorId, {
      nftId: nftId as never,
      bidderId,
      sellerId,
      amount: { amount: 50n, currency: Currency.USDT },
    });

    const accepted = await offerService.accept(actorId, offer.id);
    expect(accepted.status).toBe(OfferStatus.Accepted);
  });

  it("rejects an offer", async () => {
    const offer = await offerService.create(actorId, {
      nftId: nftId as never,
      bidderId,
      sellerId,
      amount: { amount: 50n, currency: Currency.USDT },
    });

    const rejected = await offerService.reject(actorId, offer.id);
    expect(rejected.status).toBe(OfferStatus.Rejected);
  });

  it("cancels an offer", async () => {
    const offer = await offerService.create(actorId, {
      nftId: nftId as never,
      bidderId,
      sellerId,
      amount: { amount: 50n, currency: Currency.USDT },
    });

    const cancelled = await offerService.cancel(actorId, offer.id);
    expect(cancelled.status).toBe(OfferStatus.Cancelled);
  });

  it("lists offers by NFT", async () => {
    await offerService.create(actorId, {
      nftId: nftId as never, bidderId, sellerId, amount: { amount: 50n, currency: Currency.USDT },
    });
    await offerService.create(actorId, {
      nftId: nftId as never, bidderId: "bidder-2" as never, sellerId, amount: { amount: 75n, currency: Currency.USDT },
    });

    const offers = offerService.listByNft(nftId as never);
    expect(offers).toHaveLength(2);
  });
});
