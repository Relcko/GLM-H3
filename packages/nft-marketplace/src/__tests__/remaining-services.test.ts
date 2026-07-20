import { describe, it, expect, beforeEach } from "vitest";
import { Currency } from "@relcko/types";
import { InMemoryNftRepository } from "../in-memory-repository";
import { ActivityService } from "../activity/service";
import { AnalyticsService } from "../analytics/service";
import { MediaService } from "../media/service";
import { SearchService } from "../search/service";
import { PortfolioAdapter } from "../portfolio/adapter";
import { MintService } from "../mint/service";
import { CollectionService } from "../collection/service";
import { TransferService } from "../transfer/service";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { NftStandard, NftType, NftMediaKind, NftToken, NftActivityEntry } from "../types";
import { NftEventType, NftEventPayload, publishNftEvent } from "../events";

describe("ActivityService", () => {
  let repository: InMemoryNftRepository;
  let activityService: ActivityService;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    activityService = new ActivityService(repository);
  });

  it("records activity from an event payload", () => {
    const payload: NftEventPayload = {
      eventType: "nft.mint_completed",
      aggregateId: "nft-1" as never,
      actorId: "actor-1" as never,
      payload: { collectionId: "col-1", nftId: "nft-1" },
      timestamp: new Date().toISOString(),
      source: "relcko.nft-marketplace",
    };

    activityService.record(payload);
    const entries = activityService.listByNft("nft-1" as never);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("mint");
  });

  it("records multiple activities", () => {
    const events: NftEventPayload[] = [
      { eventType: "nft.mint_completed", aggregateId: "nft-1" as never, actorId: "actor-1" as never, payload: { collectionId: "col-1" }, timestamp: "2024-01-01T00:00:00Z", source: "relcko.nft-marketplace" },
      { eventType: "nft.transferred", aggregateId: "nft-1" as never, actorId: "actor-2" as never, payload: { collectionId: "col-1", fromOwnerId: "a1", toOwnerId: "a2" }, timestamp: "2024-01-02T00:00:00Z", source: "relcko.nft-marketplace" },
      { eventType: "nft.sale_completed", aggregateId: "nft-1" as never, actorId: "actor-3" as never, payload: { collectionId: "col-1" }, timestamp: "2024-01-03T00:00:00Z", source: "relcko.nft-marketplace" },
    ];

    events.forEach(e => activityService.record(e));
    expect(activityService.listByNft("nft-1" as never)).toHaveLength(3);
  });

  it("ignores unknown event types", () => {
    const payload: NftEventPayload = {
      eventType: "nft.unknown_event",
      aggregateId: "nft-1" as never,
      actorId: "actor-1" as never,
      payload: {},
      timestamp: new Date().toISOString(),
      source: "relcko.nft-marketplace",
    };

    activityService.record(payload);
    expect(activityService.listByNft("nft-1" as never)).toHaveLength(0);
  });
});

describe("AnalyticsService", () => {
  let repository: InMemoryNftRepository;
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    analyticsService = new AnalyticsService(repository);
  });

  it("records a sale and updates volume", () => {
    analyticsService.recordSale("nft-1" as never, "col-1" as never, { amount: 1000n, currency: Currency.USDT });

    const entry = analyticsService.get("nft-1" as never);
    expect(entry).toBeDefined();
    expect(entry!.totalVolume.amount).toBe(1000n);
    expect(entry!.totalSales).toBe(1);
  });

  it("accumulates sales", () => {
    analyticsService.recordSale("nft-1" as never, "col-1" as never, { amount: 500n, currency: Currency.USDT });
    analyticsService.recordSale("nft-1" as never, "col-1" as never, { amount: 1500n, currency: Currency.USDT });

    const entry = analyticsService.get("nft-1" as never);
    expect(entry!.totalVolume.amount).toBe(2000n);
    expect(entry!.totalSales).toBe(2);
  });

  it("records transfers", () => {
    analyticsService.recordTransfer("nft-1" as never, "col-1" as never);
    analyticsService.recordTransfer("nft-1" as never, "col-1" as never);

    const entry = analyticsService.get("nft-1" as never);
    expect(entry!.transferCount).toBe(2);
  });

  it("records listings", () => {
    analyticsService.recordListing("nft-1" as never, "col-1" as never);

    const entry = analyticsService.get("nft-1" as never);
    expect(entry!.listingCount).toBe(1);
  });

  it("returns undefined for NFT without analytics", () => {
    expect(analyticsService.get("unknown" as never)).toBeUndefined();
  });
});

describe("MediaService", () => {
  let repository: InMemoryNftRepository;
  let mediaService: MediaService;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    mediaService = new MediaService(repository);
  });

  it("adds media to an NFT", () => {
    const media = mediaService.add("actor-1" as never, {
      nftId: "nft-1" as never,
      url: "ipfs://media/1",
      kind: NftMediaKind.Image,
      mimeType: "image/png",
      size: 1024,
    });

    expect(media.kind).toBe(NftMediaKind.Image);
    expect(media.url).toBe("ipfs://media/1");
  });

  it("lists media by NFT", () => {
    mediaService.add("actor-1" as never, {
      nftId: "nft-1" as never, url: "ipfs://media/1", kind: NftMediaKind.Image, mimeType: "image/png",
    });
    mediaService.add("actor-1" as never, {
      nftId: "nft-1" as never, url: "ipfs://media/2", kind: NftMediaKind.Video, mimeType: "video/mp4",
    });

    const list = mediaService.listByNft("nft-1" as never);
    expect(list).toHaveLength(2);
  });
});

describe("SearchService", () => {
  let repository: InMemoryNftRepository;
  let searchService: SearchService;
  let collectionService: CollectionService;
  let mintService: MintService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const ownerId = "owner-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    searchService = new SearchService(repository);
    collectionService = new CollectionService(repository, events);
    mintService = new MintService(repository, events);
  });

  it("searches collections by name", async () => {
    await collectionService.create(actorId, {
      name: "Pixel Pals",
      symbol: "PXL",
      description: "Pixel art collection",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/pxl",
    });

    const result = searchService.search("pixel");
    expect(result.collections).toHaveLength(1);
  });

  it("returns empty results for no match", async () => {
    const result = searchService.search("nonexistent");
    expect(result.collections).toHaveLength(0);
    expect(result.nfts).toHaveLength(0);
  });
});

describe("PortfolioAdapter", () => {
  let repository: InMemoryNftRepository;
  let portfolioAdapter: PortfolioAdapter;
  let collectionService: CollectionService;
  let mintService: MintService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const ownerId = "owner-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    portfolioAdapter = new PortfolioAdapter(repository);
    collectionService = new CollectionService(repository, events);
    mintService = new MintService(repository, events);

    const collection = await collectionService.create(actorId, {
      name: "Portfolio Test",
      symbol: "PTF",
      description: "Portfolio test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/ptf",
    });

    await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Portfolio NFT 1",
      description: "PF1",
      image: "ipfs://nft/pf1",
    });
  });

  it("computes a portfolio snapshot for an owner", () => {
    const snapshot = portfolioAdapter.computeSnapshot(ownerId);
    expect(snapshot.ownerId).toBe(ownerId);
    expect(snapshot.totalNfts).toBe(1);
    expect(snapshot.totalCollections).toBe(1);
    expect(snapshot.entries).toHaveLength(1);
  });

  it("returns existing snapshot", () => {
    portfolioAdapter.computeSnapshot(ownerId);
    const snapshot = portfolioAdapter.getSnapshot(ownerId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.ownerId).toBe(ownerId);
  });
});
