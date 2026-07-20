import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftActivityEntry } from "../types";
import type { NftEventPayload } from "../events";
import { ActivityType } from "../types";

export class ActivityService {
  constructor(
    private readonly repository: NftRepository,
    private readonly logger?: Logger,
  ) {}

  record(eventPayload: NftEventPayload): void {
    const activityType = this.mapEventToActivity(eventPayload.eventType);
    if (!activityType) return;

    const payload = eventPayload.payload as Record<string, unknown>;

    const entry: NftActivityEntry = {
      id: generateId("nftact") as EntityId,
      nftId: eventPayload.aggregateId as EntityId,
      collectionId: payload.collectionId as EntityId,
      type: activityType,
      actorId: eventPayload.actorId,
      fromId: payload.fromOwnerId as EntityId | undefined,
      toId: payload.toOwnerId as EntityId | undefined,
      amount: undefined,
      txHash: undefined,
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    this.repository.saveActivity(entry);
    this.logger?.debug("activity recorded", { activityType, nftId: entry.nftId });
  }

  listByNft(nftId: EntityId): NftActivityEntry[] {
    return this.repository.listActivityByNft(nftId);
  }

  listByCollection(collectionId: EntityId): NftActivityEntry[] {
    return this.repository.listActivityByCollection(collectionId);
  }

  private mapEventToActivity(eventType: string): ActivityType | undefined {
    const map: Record<string, ActivityType> = {
      "nft.mint_completed": ActivityType.Mint,
      "nft.transferred": ActivityType.Transfer,
      "nft.listed": ActivityType.Listing,
      "nft.sale_completed": ActivityType.Sale,
      "nft.listing_cancelled": ActivityType.Cancel,
      "nft.offer_created": ActivityType.Offer,
      "nft.offer_accepted": ActivityType.Sale,
      "nft.offer_rejected": ActivityType.Offer,
      "nft.auction_bid": ActivityType.Auction,
      "nft.auction_ended": ActivityType.Auction,
      "nft.burned": ActivityType.Burn,
      "nft.metadata_updated": ActivityType.MetadataUpdate,
      "nft.collection_verified": ActivityType.Verification,
    };
    return map[eventType];
  }
}
