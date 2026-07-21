import type { EntityId, Json, Metadata, Timestamp } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const PortfolioEventType = {
  PortfolioCreated: "portfolio.created",
  PortfolioUpdated: "portfolio.updated",
  PortfolioDeleted: "portfolio.deleted",
  PortfolioSnapshotCreated: "portfolio.snapshot_created",
  PortfolioHoldingAdded: "portfolio.holding_added",
  PortfolioHoldingRemoved: "portfolio.holding_removed",
  PortfolioHoldingUpdated: "portfolio.holding_updated",
  PortfolioPerformanceComputed: "portfolio.performance_computed",
  PortfolioRoiComputed: "portfolio.roi_computed",
  PortfolioAllocationComputed: "portfolio.allocation_computed",
  PortfolioCashflowProjected: "portfolio.cashflow_projected",
  PortfolioTimelineEntryAdded: "portfolio.timeline_entry_added",
  PortfolioAnalyticsComputed: "portfolio.analytics_computed",
  PortfolioSearchExecuted: "portfolio.search_executed",
  PortfolioExportGenerated: "portfolio.export_generated",
  PortfolioHealthChecked: "portfolio.health_checked",
  PortfolioRecomputed: "portfolio.recomputed",
} as const;

export type PortfolioEventType = (typeof PortfolioEventType)[keyof typeof PortfolioEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export async function publishPortfolioEvent(
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
    source: "relcko.portfolio",
    ...options,
  });
  await bus.publish(envelope);
}
