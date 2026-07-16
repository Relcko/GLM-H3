import { PropertyStatus, transitionProperty, type Property } from "@relcko/domain-core";
import { MarketplaceEventType } from "../events";

/**
 * Property state machine. Wraps the FROZEN `transitionProperty` from
 * `@relcko/domain-core` — it never re-declares transitions or states. The
 * richer operational workflow (submit for review, approve, publish, activate,
 * close) is expressed as EVENTS plus the canonical state transition they
 * drive. No new business states are introduced.
 */
export interface PropertyWorkflowStep {
  readonly from: PropertyStatus;
  readonly to: PropertyStatus;
  readonly event: string;
}

export const PROPERTY_WORKFLOW: ReadonlyArray<PropertyWorkflowStep> = [
  { from: PropertyStatus.Draft, to: PropertyStatus.Upcoming, event: MarketplaceEventType.PropertyPublished },
  { from: PropertyStatus.Upcoming, to: PropertyStatus.Active, event: MarketplaceEventType.PropertyActivated },
  { from: PropertyStatus.Active, to: PropertyStatus.SoldOut, event: MarketplaceEventType.PropertyStatusChanged },
  { from: PropertyStatus.Upcoming, to: PropertyStatus.Closed, event: MarketplaceEventType.PropertyClosed },
  { from: PropertyStatus.Active, to: PropertyStatus.Closed, event: MarketplaceEventType.PropertyClosed },
  { from: PropertyStatus.SoldOut, to: PropertyStatus.Closed, event: MarketplaceEventType.PropertyClosed },
];

export class PropertyStateMachine {
  /** True if `next` is a permitted frozen transition from `current`. */
  canTransition(current: PropertyStatus, next: PropertyStatus): boolean {
    try {
      transitionProperty({ status: current } as unknown as Property, next);
      return true;
    } catch {
      return false;
    }
  }

  /** Apply a canonical state transition, returning the updated property. */
  transition(property: Property, next: PropertyStatus): Property {
    return transitionProperty(property, next);
  }
}
