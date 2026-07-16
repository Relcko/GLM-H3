import { createEnvelope, type EventBus } from "@relcko/events";
import type { EntityId, Json } from "@relcko/types";

export const OperationsEventType = {
  HealthChecked: "operations.health_checked",
  MetricsCollected: "operations.metrics_collected",
  AlertOpened: "operations.alert_opened",
  AlertAcknowledged: "operations.alert_acknowledged",
  AlertResolved: "operations.alert_resolved",
  IncidentCreated: "operations.incident_created",
  IncidentResolved: "operations.incident_resolved",
  ReportGenerated: "operations.report_generated",
} as const;

export const OPERATIONS_SYSTEM_ACTOR = "relcko_operations" as EntityId;

export async function publishOperationsEvent(
  events: EventBus,
  type: string,
  aggregateId: EntityId,
  payload: Json,
  actorId: EntityId = OPERATIONS_SYSTEM_ACTOR,
): Promise<void> {
  await events.publish(createEnvelope({ type, aggregateId, actorId, payload, source: "relcko.operations" }));
}
