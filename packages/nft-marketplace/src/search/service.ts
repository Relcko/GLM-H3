import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftToken, NftCollection, NftListing } from "../types";

export interface SearchResult {
  collections: NftCollection[];
  nfts: NftToken[];
  listings: NftListing[];
}

export class SearchService {
  constructor(
    private readonly repository: NftRepository,
    private readonly logger?: Logger,
  ) {}

  search(query: string): SearchResult {
    const lowerQuery = query.toLowerCase().trim();

    const collections = this.repository.searchCollections(lowerQuery);

    const allNfts = this.repository.listCollections().flatMap(c => this.repository.listNftsByCollection(c.id));
    const nfts = allNfts.filter(
      n => n.tokenId.toLowerCase().includes(lowerQuery) || n.creatorId.toLowerCase().includes(lowerQuery),
    );

    const matchedCollectionIds = new Set([
      ...collections.map(c => c.id),
      ...nfts.map(n => n.collectionId),
    ]);

    const allListings = this.repository.listActiveListings();
    const listings = allListings.filter(l => {
      const nft = allNfts.find(n => n.id === l.nftId);
      return nft ? matchedCollectionIds.has(nft.collectionId) : false;
    });

    this.logger?.debug("search performed", { query, collectionResults: collections.length, nftResults: nfts.length });

    return { collections, nfts, listings };
  }

  searchNftsInCollection(collectionId: EntityId, query: string): NftToken[] {
    const lowerQuery = query.toLowerCase();
    const nfts = this.repository.listNftsByCollection(collectionId);
    return nfts.filter(
      n => n.tokenId.toLowerCase().includes(lowerQuery) || n.creatorId.toLowerCase().includes(lowerQuery),
    );
  }
}
