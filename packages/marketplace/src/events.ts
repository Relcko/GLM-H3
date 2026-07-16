import type { EntityId, Json, Metadata } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

/**
 * Canonical marketplace event types. Events are the ONLY side-effect channel
 * for operational progression (review, approval, reservation, funding,
 * settlement, completion, etc.) — business STATE always lives in the frozen
 * domain-core entities. Subscribers integrate NFT, Governance, Treasury, AI and
 * the Network Engine without the marketplace knowing about them.
 */
export const MarketplaceEventType = {
  PropertyCreated: "property.created",
  PropertyUpdated: "property.updated",
  PropertySubmittedForReview: "property.submitted_for_review",
  PropertyReviewApproved: "property.review_approved",
  PropertyReviewRejected: "property.review_rejected",
  PropertyPublished: "property.published",
  PropertyActivated: "property.activated",
  PropertyClosed: "property.closed",
  PropertyStatusChanged: "property.status_changed",

  InvestmentReserved: "investment.reserved",
  InvestmentConfirmed: "investment.confirmed",
  InvestmentCancelled: "investment.cancelled",
  InvestmentFunded: "investment.funded",
  InvestmentSettled: "investment.settled",
  InvestmentCompleted: "investment.completed",
  InvestmentFailed: "investment.failed",
  InvestmentRefunded: "investment.refunded",

  ListingCreated: "listing.created",
  ListingCancelled: "listing.cancelled",
  ListingSold: "listing.sold",
  ListingExpired: "listing.expired",

  SaleInitiated: "sale.initiated",
  SaleCompleted: "sale.completed",

  BookmarkAdded: "bookmark.added",
  BookmarkRemoved: "bookmark.removed",
  FavoriteAdded: "favorite.added",
  FavoriteRemoved: "favorite.removed",
  WatchlistAdded: "watchlist.added",
  WatchlistRemoved: "watchlist.removed",
  RecentlyViewed: "recently_viewed.recorded",

  DocumentAdded: "property.document_added",
  DocumentRemoved: "property.document_removed",
  MediaAdded: "property.media_added",
  MediaRemoved: "property.media_removed",
  TimelineEvent: "property.timeline",
  PropertyViewed: "property.viewed",
} as const;

export type MarketplaceEventType = (typeof MarketplaceEventType)[keyof typeof MarketplaceEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

/** Publish a canonical marketplace event through the shared EventBus. */
export async function publishMarketplaceEvent(
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
    source: "relcko.marketplace",
    ...options,
  });
  await bus.publish(envelope);
}
