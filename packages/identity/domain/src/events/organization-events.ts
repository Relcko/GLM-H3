import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { OrganizationId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface OrganizationCreatedPayload {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly displayName: string | null;
  readonly description: string | null;
  readonly createdAt: Date;
}

export interface OrganizationRenamedPayload {
  readonly organizationId: OrganizationId;
  readonly oldName: string;
  readonly newName: string;
}

export interface OrganizationDescriptionUpdatedPayload {
  readonly organizationId: OrganizationId;
  readonly oldDescription: string | null;
  readonly newDescription: string | null;
}

export interface OrganizationDisplayNameUpdatedPayload {
  readonly organizationId: OrganizationId;
  readonly oldDisplayName: string | null;
  readonly newDisplayName: string | null;
}

export interface OrganizationActivatedPayload {
  readonly organizationId: OrganizationId;
  readonly activatedAt: Date;
}

export interface OrganizationDeactivatedPayload {
  readonly organizationId: OrganizationId;
  readonly deactivatedAt: Date;
}

export interface OrganizationArchivedPayload {
  readonly organizationId: OrganizationId;
  readonly archivedAt: Date;
}

export interface OrganizationRestoredPayload {
  readonly organizationId: OrganizationId;
  readonly restoredAt: Date;
}

export class OrganizationCreated extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_CREATED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly name: string,
    readonly displayName: string | null,
    readonly description: string | null,
    readonly createdAt: Date,
  ) {
    super(props);
  }
}

export class OrganizationRenamed extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_RENAMED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly oldName: string,
    readonly newName: string,
  ) {
    super(props);
  }
}

export class OrganizationDescriptionUpdated extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_DESCRIPTION_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly oldDescription: string | null,
    readonly newDescription: string | null,
  ) {
    super(props);
  }
}

export class OrganizationDisplayNameUpdated extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_DISPLAY_NAME_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly oldDisplayName: string | null,
    readonly newDisplayName: string | null,
  ) {
    super(props);
  }
}

export class OrganizationActivated extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class OrganizationDeactivated extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_DEACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly deactivatedAt: Date,
  ) {
    super(props);
  }
}

export class OrganizationArchived extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_ARCHIVED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly archivedAt: Date,
  ) {
    super(props);
  }
}

export class OrganizationRestored extends DomainEvent {
  readonly eventType = EventCatalog.ORGANIZATION_RESTORED;

  constructor(
    props: DomainEventProps,
    readonly organizationId: OrganizationId,
    readonly restoredAt: Date,
  ) {
    super(props);
  }
}

export const OrganizationEventTypeMap = {
  created: EventCatalog.ORGANIZATION_CREATED,
  renamed: EventCatalog.ORGANIZATION_RENAMED,
  descriptionUpdated: EventCatalog.ORGANIZATION_DESCRIPTION_UPDATED,
  displayNameUpdated: EventCatalog.ORGANIZATION_DISPLAY_NAME_UPDATED,
  activated: EventCatalog.ORGANIZATION_ACTIVATED,
  deactivated: EventCatalog.ORGANIZATION_DEACTIVATED,
  archived: EventCatalog.ORGANIZATION_ARCHIVED,
  restored: EventCatalog.ORGANIZATION_RESTORED,
} as const;
