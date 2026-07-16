import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftToken } from "../types";
import { NftStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { NftNotFoundError, TransferError } from "../errors";

export interface TransferNftInput {
  nftId: EntityId;
  fromOwnerId: EntityId;
  toOwnerId: EntityId;
}

export class TransferService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async transfer(actorId: EntityId, input: TransferNftInput): Promise<NftToken> {
    const nft = this.repository.getNft(input.nftId);
    if (!nft) throw new NftNotFoundError(input.nftId as string);

    if (nft.ownerId !== input.fromOwnerId) {
      throw new TransferError(`NFT ${input.nftId} is not owned by ${input.fromOwnerId}`);
    }

    if (nft.status === NftStatus.Burned) {
      throw new TransferError(`Cannot transfer burned NFT ${input.nftId}`);
    }

    const transferred: NftToken = { ...nft, ownerId: input.toOwnerId, updatedAt: new Date().toISOString() };
    this.repository.saveNft(transferred);

    await publishNftEvent(this.events, NftEventType.NftTransferred, input.nftId, actorId, {
      nftId: input.nftId as string,
      fromOwnerId: input.fromOwnerId as string,
      toOwnerId: input.toOwnerId as string,
    });

    this.logger?.info("nft transferred", { nftId: input.nftId, from: input.fromOwnerId, to: input.toOwnerId });

    return transferred;
  }
}
