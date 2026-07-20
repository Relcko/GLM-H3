import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { ServiceAccountId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface ServiceAccountCreatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly name: string;
  readonly createdBy: UserId;
  readonly createdAt: Date;
}

export interface ServiceAccountRenamedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly oldName: string;
  readonly newName: string;
}

export interface ServiceAccountActivatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly activatedAt: Date;
}

export interface ServiceAccountDeactivatedPayload {
  readonly serviceAccountId: ServiceAccountId;
  readonly deactivatedAt: Date;
}

export class ServiceAccountCreated extends DomainEvent {
  readonly eventType = EventCatalog.SERVICE_ACCOUNT_CREATED;

  constructor(
    props: DomainEventProps,
    readonly serviceAccountId: ServiceAccountId,
    readonly name: string,
    readonly createdBy: UserId,
    readonly createdAt: Date,
  ) {
    super(props);
  }
}

export class ServiceAccountRenamed extends DomainEvent {
  readonly eventType = EventCatalog.SERVICE_ACCOUNT_RENAMED;

  constructor(
    props: DomainEventProps,
    readonly serviceAccountId: ServiceAccountId,
    readonly oldName: string,
    readonly newName: string,
  ) {
    super(props);
  }
}

export class ServiceAccountActivated extends DomainEvent {
  readonly eventType = EventCatalog.SERVICE_ACCOUNT_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly serviceAccountId: ServiceAccountId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class ServiceAccountDeactivated extends DomainEvent {
  readonly eventType = EventCatalog.SERVICE_ACCOUNT_DEACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly serviceAccountId: ServiceAccountId,
    readonly deactivatedAt: Date,
  ) {
    super(props);
  }
}

export const ServiceAccountEventTypeMap = {
  created: EventCatalog.SERVICE_ACCOUNT_CREATED,
  renamed: EventCatalog.SERVICE_ACCOUNT_RENAMED,
  activated: EventCatalog.SERVICE_ACCOUNT_ACTIVATED,
  deactivated: EventCatalog.SERVICE_ACCOUNT_DEACTIVATED,
} as const;
