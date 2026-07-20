import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { RoleId } from '../value-objects';
import type { Permission } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface RoleCreatedPayload {
  readonly roleId: RoleId;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly Permission[];
  readonly createdAt: Date;
}

export interface RoleRenamedPayload {
  readonly roleId: RoleId;
  readonly oldName: string;
  readonly newName: string;
}

export interface RoleDescriptionChangedPayload {
  readonly roleId: RoleId;
  readonly oldDescription: string | null;
  readonly newDescription: string | null;
}

export interface RolePermissionAssignedPayload {
  readonly roleId: RoleId;
  readonly permission: Permission;
}

export interface RolePermissionRevokedPayload {
  readonly roleId: RoleId;
  readonly permission: Permission;
}

export interface RoleActivatedPayload {
  readonly roleId: RoleId;
  readonly activatedAt: Date;
}

export interface RoleDeactivatedPayload {
  readonly roleId: RoleId;
  readonly deactivatedAt: Date;
}

export interface RoleDeletedPayload {
  readonly roleId: RoleId;
  readonly deletedAt: Date;
}

export class RoleCreated extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_CREATED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly name: string,
    readonly description: string | null,
    readonly permissions: readonly Permission[],
    readonly createdAt: Date,
  ) {
    super(props);
  }
}

export class RoleRenamed extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_RENAMED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly oldName: string,
    readonly newName: string,
  ) {
    super(props);
  }
}

export class RoleDescriptionChanged extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_DESCRIPTION_CHANGED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly oldDescription: string | null,
    readonly newDescription: string | null,
  ) {
    super(props);
  }
}

export class RolePermissionAssigned extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_PERMISSION_ASSIGNED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly permission: Permission,
  ) {
    super(props);
  }
}

export class RolePermissionRevoked extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_PERMISSION_REVOKED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly permission: Permission,
  ) {
    super(props);
  }
}

export class RoleActivated extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class RoleDeactivated extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_DEACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly deactivatedAt: Date,
  ) {
    super(props);
  }
}

export class RoleDeleted extends DomainEvent {
  readonly eventType = EventCatalog.ROLE_DELETED;

  constructor(
    props: DomainEventProps,
    readonly roleId: RoleId,
    readonly deletedAt: Date,
  ) {
    super(props);
  }
}

export const RoleDefinitionEventTypeMap = {
  created: EventCatalog.ROLE_CREATED,
  renamed: EventCatalog.ROLE_RENAMED,
  descriptionChanged: EventCatalog.ROLE_DESCRIPTION_CHANGED,
  permissionAssigned: EventCatalog.ROLE_PERMISSION_ASSIGNED,
  permissionRevoked: EventCatalog.ROLE_PERMISSION_REVOKED,
  activated: EventCatalog.ROLE_ACTIVATED,
  deactivated: EventCatalog.ROLE_DEACTIVATED,
  deleted: EventCatalog.ROLE_DELETED,
} as const;
