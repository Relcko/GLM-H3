import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import { createEnvelope } from "@relcko/events";
import type { Json } from "@relcko/types";
import type { AdminAction } from "./types";

export enum AdministrationEventType {
  ActionExecuted = "relcko.administration.action_executed",
  EmergencyPaused = "relcko.administration.emergency_paused",
  EmergencyResumed = "relcko.administration.emergency_resumed",
  MaintenanceEntered = "relcko.administration.maintenance_entered",
  MaintenanceExited = "relcko.administration.maintenance_exited",
  AnnouncementPublished = "relcko.administration.announcement_published",
  BackupTriggered = "relcko.administration.backup_triggered",
  JobScheduled = "relcko.administration.job_scheduled",
  FeatureFlagChanged = "relcko.administration.feature_flag_changed",
  ConfigurationChanged = "relcko.administration.configuration_changed",
}

export interface PublishAdminOptions {
  readonly actorId: EntityId;
  readonly aggregateId?: EntityId;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly payload?: Json;
  readonly source?: string;
}

/** Publish a canonical administration event onto the shared Event Bus. */
export async function publishAdministrationEvent(
  events: EventBus,
  type: AdministrationEventType | string,
  actorId: EntityId,
  payload: Json,
  options: Partial<PublishAdminOptions> = {},
): Promise<void> {
  await events.publish(
    createEnvelope({
      type,
      aggregateId: options.aggregateId ?? (actorId as EntityId),
      actorId,
      payload,
      correlationId: options.correlationId,
      traceId: options.traceId,
      source: options.source ?? "relcko.administration",
    }),
  );
}

/** Build a stable correlation id for an administrative action. */
export function newAdminCorrelationId(): string {
  return `admin_${generateId("corr")}`;
}
