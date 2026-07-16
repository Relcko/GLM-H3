import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftCollection } from "../types";
import { NftStandard, VerificationStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { CollectionNotFoundError } from "../errors";

export interface CreateCollectionInput {
  name: string;
  symbol: string;
  description: string;
  creatorId: EntityId;
  standard: NftStandard;
  metadataUri: string;
  imageUrl?: string;
  bannerUrl?: string;
  category?: string;
  royaltyBps?: number;
}

export class CollectionService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateCollectionInput): Promise<NftCollection> {
    const collection: NftCollection = {
      id: generateId("nftcol") as EntityId,
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      creatorId: input.creatorId,
      ownerId: input.creatorId,
      standard: input.standard,
      contractAddress: undefined,
      totalSupply: 0n,
      verified: false,
      verificationStatus: VerificationStatus.Unverified,
      metadataUri: input.metadataUri,
      imageUrl: input.imageUrl,
      bannerUrl: input.bannerUrl,
      category: input.category,
      royaltyBps: input.royaltyBps ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveCollection(collection);

    await publishNftEvent(this.events, NftEventType.NftCollectionCreated, collection.id, actorId, {
      collectionId: collection.id as string,
      name: collection.name,
      symbol: collection.symbol,
    });

    this.logger?.info("collection created", { collectionId: collection.id, name: collection.name });

    return collection;
  }

  async update(actorId: EntityId, collectionId: EntityId, updates: Partial<CreateCollectionInput>): Promise<NftCollection> {
    const existing = this.getCollection(collectionId);
    const updated: NftCollection = {
      ...existing,
      ...updates,
      ownerId: (updates.creatorId as EntityId) ?? existing.ownerId,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveCollection(updated);

    await publishNftEvent(this.events, NftEventType.NftCollectionUpdated, collectionId, actorId, {
      collectionId: collectionId as string,
    });

    return updated;
  }

  getCollection(id: EntityId): NftCollection {
    const c = this.repository.getCollection(id);
    if (!c) throw new CollectionNotFoundError(id as string);
    return c;
  }

  listByCreator(creatorId: EntityId): NftCollection[] {
    return this.repository.listCollectionsByCreator(creatorId);
  }

  listAll(): NftCollection[] {
    return this.repository.listCollections();
  }

  search(query: string): NftCollection[] {
    return this.repository.searchCollections(query);
  }
}
