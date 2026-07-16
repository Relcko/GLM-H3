import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus, createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNftRepository } from "../in-memory-repository";
import { MintService } from "../mint/service";
import { TransferService } from "../transfer/service";
import { CollectionService } from "../collection/service";
import { NftStandard, NftType, NftStatus, VerificationStatus } from "../types";

describe("NFT Minting", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let mintService: MintService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const ownerId = "owner-1" as never;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    mintService = new MintService(repository, events);
    collectionService = new CollectionService(repository, events);
  });

  it("mints an NFT and increments collection supply", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Test Collection",
      symbol: "TEST",
      description: "A test collection",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/1",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Test NFT",
      description: "A test NFT",
      image: "ipfs://nft/1",
    });

    expect(nft).toBeDefined();
    expect(nft.collectionId).toBe(collection.id);
    expect(nft.ownerId).toBe(ownerId);
    expect(nft.status).toBe(NftStatus.Minted);

    const updatedCollection = repository.getCollection(collection.id);
    expect(updatedCollection?.totalSupply).toBe(1n);
  });

  it("burns an NFT and decrements collection supply", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Burn Test",
      symbol: "BURN",
      description: "Burn test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/burn",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Burn NFT",
      description: "To be burned",
      image: "ipfs://nft/burn",
    });

    await mintService.burn(actorId, nft.id);

    const burned = repository.getNft(nft.id);
    expect(burned?.status).toBe(NftStatus.Burned);
    expect(repository.getCollection(collection.id)?.totalSupply).toBe(0n);
  });

  it("rejects burning an already burned NFT", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Double Burn",
      symbol: "DBURN",
      description: "Double burn test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/dburn",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Double Burn",
      description: "Double burn",
      image: "ipfs://nft/dburn",
    });

    await mintService.burn(actorId, nft.id);
    await expect(mintService.burn(actorId, nft.id)).rejects.toThrow("already burned");
  });

  it("throws when minting to a non-existent collection", async () => {
    await expect(mintService.mint(actorId, {
      collectionId: "nonexistent" as never,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Ghost",
      description: "Ghost NFT",
      image: "ipfs://nft/ghost",
    })).rejects.toThrow("Collection nonexistent not found");
  });
});

describe("NFT Transfer", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let mintService: MintService;
  let transferService: TransferService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;
  const ownerId = "owner-1" as never;
  const newOwnerId = "owner-2" as never;
  let nftId: string;

  beforeEach(async () => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    mintService = new MintService(repository, events);
    transferService = new TransferService(repository, events);
    collectionService = new CollectionService(repository, events);

    const collection = await collectionService.create(actorId, {
      name: "Transfer Test",
      symbol: "TXFR",
      description: "Transfer test",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/txfr",
    });

    const nft = await mintService.mint(actorId, {
      collectionId: collection.id,
      creatorId,
      ownerId,
      nftType: NftType.Property,
      standard: NftStandard.ERC721,
      supply: 1n,
      name: "Transfer NFT",
      description: "To be transferred",
      image: "ipfs://nft/txfr",
    });
    nftId = nft.id as string;
  });

  it("transfers ownership to a new owner", async () => {
    const transferred = await transferService.transfer(actorId, {
      nftId: nftId as never,
      fromOwnerId: ownerId,
      toOwnerId: newOwnerId,
    });

    expect(transferred.ownerId).toBe(newOwnerId);
    expect(repository.getNft(nftId as never)?.ownerId).toBe(newOwnerId);
  });

  it("rejects transfer from non-owner", async () => {
    await expect(transferService.transfer(actorId, {
      nftId: nftId as never,
      fromOwnerId: "wrong-owner" as never,
      toOwnerId: newOwnerId,
    })).rejects.toThrow("not owned by");
  });

  it("rejects transfer of burned NFT", async () => {
    await mintService.burn(actorId, nftId as never);
    await expect(transferService.transfer(actorId, {
      nftId: nftId as never,
      fromOwnerId: ownerId,
      toOwnerId: newOwnerId,
    })).rejects.toThrow("Cannot transfer burned");
  });
});
