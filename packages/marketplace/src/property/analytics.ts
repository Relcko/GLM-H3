import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Principal } from "../authorization";
import { subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import type { MarketplaceRepository } from "../repository";
import type { PropertyAnalytics } from "../types";

/** Engagement analytics for a property (views, interactions, demand signals). */
export class PropertyAnalyticsService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly events?: EventBus,
  ) {}

  async recordView(principal: Principal, propertyId: EntityId, viewerId?: EntityId): Promise<void> {
    this.repository.recordView(propertyId, viewerId);
    if (this.events) {
      await publishMarketplaceEvent(
        this.events,
        MarketplaceEventType.PropertyViewed,
        propertyId,
        (viewerId ?? subjectId(principal)) as EntityId,
        {},
      );
    }
  }

  get(propertyId: EntityId): PropertyAnalytics {
    return this.repository.getAnalytics(propertyId);
  }
}
