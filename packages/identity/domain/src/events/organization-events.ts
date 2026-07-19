import { EventCatalog } from './event-catalog';

import type { OrganizationId, UserId } from '../value-objects';

export interface OrganizationCreatedPayload {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly createdBy: UserId;
  readonly createdAt: Date;
}

export interface OrganizationUpdatedPayload {
  readonly organizationId: OrganizationId;
  readonly name?: string;
  readonly updatedAt: Date;
}

export interface OrganizationDeletedPayload {
  readonly organizationId: OrganizationId;
  readonly deletedAt: Date;
}

export interface MemberAddedPayload {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: string;
  readonly addedAt: Date;
}

export interface MemberRemovedPayload {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly removedAt: Date;
}

export interface MemberRoleChangedPayload {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly previousRole: string;
  readonly newRole: string;
  readonly changedAt: Date;
}

export const OrganizationEventTypeMap = {
  created: EventCatalog.ORGANIZATION_CREATED,
  updated: EventCatalog.ORGANIZATION_UPDATED,
  deleted: EventCatalog.ORGANIZATION_DELETED,
  memberAdded: EventCatalog.MEMBER_ADDED,
  memberRemoved: EventCatalog.MEMBER_REMOVED,
  memberRoleChanged: EventCatalog.MEMBER_ROLE_CHANGED,
} as const;
