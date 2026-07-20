import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { createNftMarketplace, NftMarketplace } from "../composition-root";
import { InMemoryNftRepository } from "../in-memory-repository";
import { NftStandard, NftType } from "../types";

describe("NftMarketplace (composition root)", () => {
  let marketplace: NftMarketplace;
  let events: EventBus;

  beforeEach(() => {
    events = new InMemoryEventBus();
    marketplace = createNftMarketplace({ events });
  });

  it("exposes all services", () => {
    expect(marketplace.nftService).toBeDefined();
    expect(marketplace.collectionService).toBeDefined();
    expect(marketplace.metadataService).toBeDefined();
    expect(marketplace.mintService).toBeDefined();
    expect(marketplace.transferService).toBeDefined();
    expect(marketplace.listingService).toBeDefined();
    expect(marketplace.offerService).toBeDefined();
    expect(marketplace.auctionService).toBeDefined();
    expect(marketplace.royaltyService).toBeDefined();
    expect(marketplace.verificationService).toBeDefined();
    expect(marketplace.activityService).toBeDefined();
    expect(marketplace.analyticsService).toBeDefined();
    expect(marketplace.mediaService).toBeDefined();
    expect(marketplace.searchService).toBeDefined();
    expect(marketplace.portfolioAdapter).toBeDefined();
  });

  it("accepts a custom repository", () => {
    const customRepo = new InMemoryNftRepository();
    const custom = createNftMarketplace({ events, repository: customRepo });
    expect(custom).toBeDefined();
  });

  it("completes a full end-to-end flow", async () => {
    const actorId = "actor-1" as never;
    const creatorId = "creator-1" as never;
    const ownerId = "owner-1" as never;
    const buyerId = "buyer-1" as never;

    const collection = await marketplace.collectionService.create(actorId, {
      name: "E2E Collection",
      symbol: "E2E",
      description: "End-to-end test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/e2e",
    });

    const nft = await marketplace.mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "E2E NFT",
      description: "E2E test",
      image: "ipfs://nft/e2e",
    });

    const listing = await marketplace.listingService.create(actorId, {
      nftId: nft.id,
      sellerId: ownerId,
      price: { amount: 100n, currency: Currency.USDT },
    });

    expect(listing.status).toBe("active");

    const offer = await marketplace.offerService.create(actorId, {
      nftId: nft.id,
      bidderId: buyerId,
      sellerId: ownerId,
      amount: { amount: 90n, currency: Currency.USDT },
    });

    expect(offer.status).toBe("active");
  });
});
