import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryNftRepository } from "../in-memory-repository";
import { CollectionService } from "../collection/service";
import { MetadataService } from "../metadata/service";
import { NftStandard, VerificationStatus } from "../types";

describe("CollectionService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    collectionService = new CollectionService(repository, events);
  });

  it("creates a collection with default values", async () => {
    const c = await collectionService.create(actorId, {
      name: "My Collection",
      symbol: "MYC",
      description: "My first collection",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/myc",
    });

    expect(c.name).toBe("My Collection");
    expect(c.symbol).toBe("MYC");
    expect(c.creatorId).toBe(creatorId);
    expect(c.ownerId).toBe(creatorId);
    expect(c.totalSupply).toBe(0n);
    expect(c.verified).toBe(false);
    expect(c.verificationStatus).toBe(VerificationStatus.Unverified);
    expect(c.royaltyBps).toBe(0);
  });

  it("updates a collection", async () => {
    const c = await collectionService.create(actorId, {
      name: "Original",
      symbol: "ORIG",
      description: "Original description",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/orig",
    });

    const updated = await collectionService.update(actorId, c.id, {
      name: "Updated Collection",
    });

    expect(updated.name).toBe("Updated Collection");
    expect(updated.symbol).toBe("ORIG");
  });

  it("lists collections by creator", async () => {
    await collectionService.create(actorId, {
      name: "C1", symbol: "C1", description: "D1", creatorId, standard: NftStandard.ERC721, metadataUri: "ipfs://c1",
    });
    await collectionService.create(actorId, {
      name: "C2", symbol: "C2", description: "D2", creatorId, standard: NftStandard.ERC721, metadataUri: "ipfs://c2",
    });

    const list = collectionService.listByCreator(creatorId);
    expect(list).toHaveLength(2);
  });

  it("searches collections by name", async () => {
    await collectionService.create(actorId, {
      name: "Alpha", symbol: "ALPHA", description: "First collection", creatorId, standard: NftStandard.ERC721, metadataUri: "ipfs://alpha",
    });
    await collectionService.create(actorId, {
      name: "Beta", symbol: "BETA", description: "Second collection", creatorId, standard: NftStandard.ERC721, metadataUri: "ipfs://beta",
    });

    const results = collectionService.search("alpha");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Alpha");
  });

  it("throws for non-existent collection", () => {
    expect(() => collectionService.getCollection("missing" as never)).toThrow("Collection missing not found");
  });
});

describe("MetadataService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let metadataService: MetadataService;
  const actorId = "actor-1" as never;
  const nftId = "nft-1" as never;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    metadataService = new MetadataService(repository, events);
  });

  it("creates metadata for an NFT", async () => {
    const md = await metadataService.create(actorId, {
      nftId,
      name: "Test NFT",
      description: "A test NFT",
      image: "ipfs://nft/test",
      attributes: [{ traitType: "Color", value: "Blue" }],
    });

    expect(md.nftId).toBe(nftId);
    expect(md.name).toBe("Test NFT");
    expect(md.version).toBe(1);
    expect(md.attributes).toHaveLength(1);
  });

  it("updates existing metadata and increments version", async () => {
    await metadataService.create(actorId, {
      nftId,
      name: "Original",
      description: "Original description",
      image: "ipfs://nft/orig",
    });

    const updated = await metadataService.update(actorId, nftId, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.version).toBe(2);
  });

  it("returns undefined for NFT without metadata", () => {
    expect(metadataService.get("no-md" as never)).toBeUndefined();
  });

  it("generates an IPFS URI", async () => {
    const md = await metadataService.create(actorId, {
      nftId,
      name: "URI Test",
      description: "URI test",
      image: "ipfs://nft/uri",
    });
    const uri = metadataService.generateUri(md);
    expect(uri).toContain("ipfs://");
    expect(uri).toContain(md.id);
  });
});
