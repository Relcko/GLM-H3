import { EventCatalog } from './event-catalog';

import type { ServiceAccountId, UserId } from '../value-objects';

export interface ServiceAccountCreatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly name: string;
  readonly createdBy: UserId;
  readonly createdAt: Date;
}

export interface ServiceAccountUpdatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly name?: string;
  readonly updatedAt: Date;
}

export interface ServiceAccountActivatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly activatedAt: Date;
}

export interface ServiceAccountDeactivatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly deactivatedAt: Date;
}

export const ServiceAccountEventTypeMap = {
  created: EventCatalog.SERVICE_ACCOUNT_CREATED,
  updated: EventCatalog.SERVICE_ACCOUNT_UPDATED,
  activated: EventCatalog.SERVICE_ACCOUNT_ACTIVATED,
  deactivated: EventCatalog.SERVICE_ACCOUNT_DEACTIVATED,
} as const;
