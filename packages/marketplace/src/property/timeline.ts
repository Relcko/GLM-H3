import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Principal } from "../authorization";
import { subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import type { MarketplaceRepository } from "../repository";
import type { PropertyTimelineEvent } from "../types";
import type { Logger } from "@relcko/logging";

/**
 * Operational, append-only timeline for a property. Records review/approval,
 * publishing, status changes, document/media additions and investment events
 * as a chronological audit of workflow progression (not business state).
 */
export class PropertyTimelineService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly events?: EventBus,
    private readonly logger?: Logger,
  ) {}

  async record(
    principal: Principal,
    propertyId: EntityId,
    type: string,
    payload: Readonly<Record<string, unknown>> = {},
  ): Promise<PropertyTimelineEvent> {
    const event: PropertyTimelineEvent = {
      id: generateId("tle"),
      propertyId,
      type,
      actorId: subjectId(principal) as EntityId,
      occurredAt: new Date().toISOString(),
      payload,
    };
    this.repository.saveTimelineEvent(event);
    if (this.events) {
      await publishMarketplaceEvent(this.events, MarketplaceEventType.TimelineEvent, propertyId, event.actorId, {
        type,
        ...payload,
      });
    }
    return event;
  }

  list(propertyId: EntityId): PropertyTimelineEvent[] {
    return this.repository.listTimeline(propertyId);
  }
}
