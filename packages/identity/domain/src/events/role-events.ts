import { EventCatalog } from './event-catalog';

import type { RoleId, UserId } from '../value-objects';

export interface RoleCreatedPayload {
  readonly roleId: RoleId;
  readonly name: string;
  readonly description?: string;
  readonly permissions: readonly string[];
  readonly createdAt: Date;
}

export interface RoleUpdatedPayload {
  readonly roleId: RoleId;
  readonly name?: string;
  readonly description?: string;
  readonly permissions?: readonly string[];
  readonly updatedAt: Date;
}

export interface RoleDeletedPayload {
  readonly roleId: RoleId;
  readonly deletedAt: Date;
}

export interface RoleAssignedPayload {
  readonly roleId: RoleId;
  readonly assigneeId: UserId;
  readonly assignedBy: UserId;
  readonly assignedAt: Date;
}

export interface RoleUnassignedPayload {
  readonly roleId: RoleId;
  readonly assigneeId: UserId;
  readonly unassignedBy: UserId;
  readonly unassignedAt: Date;
}

export const RoleEventTypeMap = {
  created: EventCatalog.ROLE_CREATED,
  updated: EventCatalog.ROLE_UPDATED,
  deleted: EventCatalog.ROLE_DELETED,
  assigned: EventCatalog.ROLE_ASSIGNED,
  unassigned: EventCatalog.ROLE_UNASSIGNED,
} as const;
