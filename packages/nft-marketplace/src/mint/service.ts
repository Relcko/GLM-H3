import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftToken, MintRequest } from "../types";
import { NftStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { CollectionNotFoundError, MintError } from "../errors";

export class MintService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async mint(actorId: EntityId, input: MintRequest): Promise<NftToken> {
    const collection = this.repository.getCollection(input.collectionId);
    if (!collection) throw new CollectionNotFoundError(input.collectionId as string);

    const nft: NftToken = {
      id: generateId("nft") as EntityId,
      tokenId: `${collection.symbol}-${Date.now()}`,
      collectionId: input.collectionId,
      ownerId: input.ownerId,
      creatorId: input.creatorId,
      nftType: input.nftType,
      standard: input.standard,
      metadataUri: "",
      supply: input.supply,
      status: NftStatus.Minted,
      propertyId: input.propertyId,
      fractionId: input.fractionId,
      mintedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveNft(nft);

    const updatedCollection = { ...collection, totalSupply: collection.totalSupply + 1n, updatedAt: new Date().toISOString() };
    this.repository.saveCollection(updatedCollection);

    await publishNftEvent(this.events, NftEventType.NftMintCompleted, nft.id, actorId, {
      nftId: nft.id as string,
      tokenId: nft.tokenId,
      collectionId: nft.collectionId as string,
      ownerId: nft.ownerId as string,
    });

    this.logger?.info("nft minted", { nftId: nft.id, tokenId: nft.tokenId, collectionId: nft.collectionId });

    return nft;
  }

  async burn(actorId: EntityId, nftId: EntityId): Promise<void> {
    const nft = this.repository.getNft(nftId);
    if (!nft) throw new MintError(`NFT ${nftId} not found`);

    if (nft.status === NftStatus.Burned) {
      throw new MintError(`NFT ${nftId} is already burned`);
    }

    const burned: NftToken = { ...nft, status: NftStatus.Burned, updatedAt: new Date().toISOString() };
    this.repository.saveNft(burned);

    const collection = this.repository.getCollection(nft.collectionId);
    if (collection) {
      const updated = { ...collection, totalSupply: collection.totalSupply - 1n, updatedAt: new Date().toISOString() };
      this.repository.saveCollection(updated);
    }

    await publishNftEvent(this.events, NftEventType.NftBurned, nftId, actorId, {
      nftId: nftId as string,
    });

    this.logger?.info("nft burned", { nftId });
  }
}
