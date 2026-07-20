import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { VerificationStatus, NftCollection } from "../types";
import { VerificationStatus as VS } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { CollectionNotFoundError } from "../errors";

export interface VerificationRequest {
  collectionId: EntityId;
  requesterId: EntityId;
  documents?: string[];
}

export class VerificationService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  request(actorId: EntityId, input: VerificationRequest): NftCollection {
    const collection = this.repository.getCollection(input.collectionId);
    if (!collection) throw new CollectionNotFoundError(input.collectionId as string);

    if (collection.verificationStatus === VS.Verified) {
      throw new Error(`Collection ${input.collectionId} is already verified`);
    }

    const updated: NftCollection = {
      ...collection,
      verificationStatus: VS.Pending,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveCollection(updated);

    publishNftEvent(this.events, NftEventType.NftVerificationRequested, input.collectionId, actorId, {
      collectionId: input.collectionId as string,
      requesterId: input.requesterId as string,
    } as never);

    this.logger?.info("verification requested", { collectionId: input.collectionId });

    return updated;
  }

  approve(actorId: EntityId, collectionId: EntityId): NftCollection {
    const collection = this.repository.getCollection(collectionId);
    if (!collection) throw new CollectionNotFoundError(collectionId as string);

    if (collection.verificationStatus !== VS.Pending) {
      throw new Error(`Collection ${collectionId} has no pending verification request`);
    }

    const updated: NftCollection = {
      ...collection,
      verified: true,
      verificationStatus: VS.Verified,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveCollection(updated);

    publishNftEvent(this.events, NftEventType.NftCollectionVerified, collectionId, actorId, {
      collectionId: collectionId as string,
    } as never);

    this.logger?.info("collection verified", { collectionId });

    return updated;
  }

  reject(actorId: EntityId, collectionId: EntityId): NftCollection {
    const collection = this.repository.getCollection(collectionId);
    if (!collection) throw new CollectionNotFoundError(collectionId as string);

    if (collection.verificationStatus !== VS.Pending) {
      throw new Error(`Collection ${collectionId} has no pending verification request`);
    }

    const updated: NftCollection = {
      ...collection,
      verified: false,
      verificationStatus: VS.Rejected,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveCollection(updated);

    publishNftEvent(this.events, NftEventType.NftCollectionVerificationRejected, collectionId, actorId, {
      collectionId: collectionId as string,
    } as never);

    return updated;
  }
}
