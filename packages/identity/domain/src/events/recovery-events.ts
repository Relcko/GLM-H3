import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { RecoveryId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface RecoveryRequestedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly initiatedAt: Date;
}

export interface RecoveryResentPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly resentAt: Date;
  readonly resendCount: number;
}

export interface RecoveryVerifiedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly verifiedAt: Date;
}

export interface RecoveryCompletedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly completedAt: Date;
}

export interface RecoveryExpiredPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly expiredAt: Date;
}

export interface RecoveryCancelledPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly cancelledAt: Date;
}

export class RecoveryRequested extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_INITIATED;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly initiatedAt: Date,
  ) {
    super(props);
  }
}

export class RecoveryResent extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_RESENT;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly resentAt: Date,
    readonly resendCount: number,
  ) {
    super(props);
  }
}

export class RecoveryVerified extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_VERIFIED;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly verifiedAt: Date,
  ) {
    super(props);
  }
}

export class RecoveryCompleted extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_COMPLETED;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly completedAt: Date,
  ) {
    super(props);
  }
}

export class RecoveryExpired extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_EXPIRED;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly expiredAt: Date,
  ) {
    super(props);
  }
}

export class RecoveryCancelled extends DomainEvent {
  readonly eventType = EventCatalog.RECOVERY_CANCELLED;

  constructor(
    props: DomainEventProps,
    readonly recoveryId: RecoveryId,
    readonly userId: UserId,
    readonly cancelledAt: Date,
  ) {
    super(props);
  }
}

export const RecoveryEventTypeMap = {
  requested: EventCatalog.RECOVERY_INITIATED,
  resent: EventCatalog.RECOVERY_RESENT,
  verified: EventCatalog.RECOVERY_VERIFIED,
  completed: EventCatalog.RECOVERY_COMPLETED,
  expired: EventCatalog.RECOVERY_EXPIRED,
  cancelled: EventCatalog.RECOVERY_CANCELLED,
} as const;
