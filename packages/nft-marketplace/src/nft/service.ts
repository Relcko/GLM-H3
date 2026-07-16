import type { EntityId, Money } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftToken } from "../types";
import { NftStatus } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { NftNotFoundError } from "../errors";

export class NftService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  getNft(id: EntityId): NftToken {
    const nft = this.repository.getNft(id);
    if (!nft) throw new NftNotFoundError(id as string);
    return nft;
  }

  getNftByTokenId(tokenId: string, collectionId: EntityId): NftToken | undefined {
    return this.repository.getNftByTokenId(tokenId, collectionId);
  }

  listByOwner(ownerId: EntityId): NftToken[] {
    return this.repository.listNftsByOwner(ownerId);
  }

  listByCollection(collectionId: EntityId): NftToken[] {
    return this.repository.listNftsByCollection(collectionId);
  }

  listByProperty(propertyId: EntityId): NftToken[] {
    return this.repository.listNftsByProperty(propertyId);
  }
}
