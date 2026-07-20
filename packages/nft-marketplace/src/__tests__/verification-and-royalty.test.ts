import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNftRepository } from "../in-memory-repository";
import { VerificationService } from "../verification/service";
import { RoyaltyService } from "../royalty/service";
import { CollectionService } from "../collection/service";
import { NftStandard, VerificationStatus } from "../types";

describe("VerificationService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let verificationService: VerificationService;
  let collectionService: CollectionService;
  const actorId = "actor-1" as never;
  const creatorId = "creator-1" as never;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    verificationService = new VerificationService(repository, events);
    collectionService = new CollectionService(repository, events);
  });

  it("requests verification for a collection", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Verify Me",
      symbol: "VFY",
      description: "Verify this",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/vfy",
    });

    const result = verificationService.request(actorId, {
      collectionId: collection.id,
      requesterId: creatorId,
    });

    expect(result.verificationStatus).toBe(VerificationStatus.Pending);
  });

  it("approves verification", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Approve Me",
      symbol: "APR",
      description: "Approve this",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/apr",
    });

    verificationService.request(actorId, { collectionId: collection.id, requesterId: creatorId });
    const approved = verificationService.approve(actorId, collection.id);

    expect(approved.verified).toBe(true);
    expect(approved.verificationStatus).toBe(VerificationStatus.Verified);
  });

  it("rejects verification", async () => {
    const collection = await collectionService.create(actorId, {
      name: "Reject Me",
      symbol: "RJT",
      description: "Reject this",
      creatorId,
      standard: NftStandard.ERC721,
      metadataUri: "ipfs://collection/rjt",
    });

    verificationService.request(actorId, { collectionId: collection.id, requesterId: creatorId });
    const rejected = verificationService.reject(actorId, collection.id);

    expect(rejected.verified).toBe(false);
    expect(rejected.verificationStatus).toBe(VerificationStatus.Rejected);
  });

  it("throws when verifying without request", () => {
    const fakeId = "nonexistent" as never;
    expect(() => verificationService.approve(actorId, fakeId as never)).toThrow();
  });
});

describe("RoyaltyService", () => {
  let repository: InMemoryNftRepository;
  let events: EventBus;
  let royaltyService: RoyaltyService;

  beforeEach(() => {
    repository = new InMemoryNftRepository();
    events = new InMemoryEventBus();
    royaltyService = new RoyaltyService(repository, events);
  });

  it("sets royalty config", () => {
    const config = royaltyService.setConfig(
      "actor-1" as never,
      "collection-1" as never,
      "receiver-1" as never,
      250,
      1000,
    );

    expect(config.bps).toBe(250);
    expect(config.receiverId).toBe("receiver-1" as never);
  });

  it("calculates royalty amount", () => {
    royaltyService.setConfig(
      "actor-1" as never,
      "collection-1" as never,
      "receiver-1" as never,
      500,
    );

    const result = royaltyService.calculateRoyalty("collection-1" as never, 10000n, Currency.USDT);
    expect(result).toBeDefined();
    expect(result!.amount.amount).toBe(500n);
    expect(result!.receiverId).toBe("receiver-1" as never);
  });

  it("returns undefined for collection without royalty config", () => {
    const result = royaltyService.calculateRoyalty("no-config" as never, 10000n, Currency.USDT);
    expect(result).toBeUndefined();
  });

  it("rejects invalid bps values", () => {
    expect(() => royaltyService.setConfig(
      "actor-1" as never, "c" as never, "r" as never, 0,
    )).toThrow("must be between 1 and 10000");

    expect(() => royaltyService.setConfig(
      "actor-1" as never, "c" as never, "r" as never, 10001,
    )).toThrow("must be between 1 and 10000");
  });
});
