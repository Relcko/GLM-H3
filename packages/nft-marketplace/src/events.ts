import type { EntityId, Json, Metadata, Timestamp } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const NftEventType = {
  NftMintRequested: "nft.mint_requested",
  NftMintEligibilityPassed: "nft.mint_eligibility_passed",
  NftMintEligibilityFailed: "nft.mint_eligibility_failed",
  NftMintCompleted: "nft.mint_completed",
  NftMintFailed: "nft.mint_failed",
  NftTransferred: "nft.transferred",
  NftBurned: "nft.burned",
  NftMetadataUpdated: "nft.metadata_updated",
  NftListed: "nft.listed",
  NftListingPriceUpdated: "nft.listing_price_updated",
  NftListingCancelled: "nft.listing_cancelled",
  NftListingExpired: "nft.listing_expired",
  NftListedCollection: "nft.listed_collection",
  NftOfferCreated: "nft.offer_created",
  NftOfferCountered: "nft.offer_countered",
  NftOfferAccepted: "nft.offer_accepted",
  NftOfferRejected: "nft.offer_rejected",
  NftOfferCancelled: "nft.offer_cancelled",
  NftOfferExpired: "nft.offer_expired",
  NftAuctionCreated: "nft.auction_created",
  NftAuctionBid: "nft.auction_bid",
  NftAuctionEnded: "nft.auction_ended",
  NftAuctionSettled: "nft.auction_settled",
  NftAuctionCancelled: "nft.auction_cancelled",
  NftSaleCompleted: "nft.sale_completed",
  NftSalePrivateCompleted: "nft.sale_private_completed",
  NftCollectionCreated: "nft.collection_created",
  NftCollectionUpdated: "nft.collection_updated",
  NftCollectionVerified: "nft.collection_verified",
  NftVerificationRequested: "nft.verification_requested",
  NftCollectionVerificationRejected: "nft.collection_verification_rejected",
  NftCreatorVerified: "nft.creator_verified",
  NftAssetVerified: "nft.asset_verified",
  NftPropertyVerified: "nft.property_verified",
  NftMetadataIntegrityPassed: "nft.metadata_integrity_passed",
  NftMetadataIntegrityFailed: "nft.metadata_integrity_failed",
  NftOwnershipIntegrityPassed: "nft.ownership_integrity_passed",
  NftOwnershipIntegrityFailed: "nft.ownership_integrity_failed",
  NftRoyaltyPaid: "nft.royalty_paid",
  NftPortfolioUpdated: "nft.portfolio_updated",
  NftActivityMint: "nft.activity_mint",
  NftActivityTransfer: "nft.activity_transfer",
  NftActivityListing: "nft.activity_listing",
  NftActivitySale: "nft.activity_sale",
  NftActivityOffer: "nft.activity_offer",
  NftActivityAuction: "nft.activity_auction",
  NftActivityCancel: "nft.activity_cancel",
  NftActivityMetadataUpdate: "nft.activity_metadata_update",
  NftActivityVerification: "nft.activity_verification",
  NftActivityBurn: "nft.activity_burn",
} as const;

export type NftEventType = (typeof NftEventType)[keyof typeof NftEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export async function publishNftEvent(
  bus: EventBus,
  type: string,
  aggregateId: EntityId,
  actorId: EntityId,
  payload: Json,
  options: PublishEventOptions = {},
): Promise<void> {
  const envelope = createEnvelope({
    type,
    aggregateId,
    actorId,
    payload,
    source: "relcko.nft-marketplace",
    ...options,
  });
  await bus.publish(envelope);
}

export interface NftEventPayload {
  readonly eventType: string;
  readonly aggregateId: EntityId;
  readonly actorId: EntityId;
  readonly payload: Json;
  readonly timestamp: Timestamp;
  readonly source: string;
}
