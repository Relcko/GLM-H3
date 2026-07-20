import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftPortfolioSnapshot, NftPortfolioEntry } from "../types";

export class PortfolioAdapter {
  constructor(
    private readonly repository: NftRepository,
    private readonly logger?: Logger,
  ) {}

  computeSnapshot(ownerId: EntityId): NftPortfolioSnapshot {
    const nfts = this.repository.listNftsByOwner(ownerId);

    const collectionIds = new Set<EntityId>();
    const entries: NftPortfolioEntry[] = nfts.map(nft => {
      collectionIds.add(nft.collectionId);
      return {
        nftId: nft.id,
        collectionId: nft.collectionId,
        tokenId: nft.tokenId,
        name: "",
        image: "",
        nftType: nft.nftType,
        quantity: nft.supply,
        acquiredAt: nft.mintedAt,
      };
    });

    const snapshot: NftPortfolioSnapshot = {
      ownerId,
      totalNfts: nfts.length,
      totalCollections: collectionIds.size,
      entries,
      computedAt: new Date().toISOString(),
    };

    this.repository.savePortfolioSnapshot(snapshot);

    this.logger?.info("portfolio snapshot computed", { ownerId, totalNfts: nfts.length });

    return snapshot;
  }

  getSnapshot(ownerId: EntityId): NftPortfolioSnapshot | undefined {
    return this.repository.getPortfolioSnapshot(ownerId);
  }
}
