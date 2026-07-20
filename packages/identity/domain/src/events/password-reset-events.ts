import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { PasswordResetId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface PasswordResetInitiatedPayload {
  readonly passwordResetId: PasswordResetId;
  readonly userId: UserId;
  readonly token: string;
  readonly expiresAt: Date;
  readonly resendCount: number;
  readonly initiatedAt: Date;
}

export interface PasswordResetCompletedPayload {
  readonly passwordResetId: PasswordResetId;
  readonly userId: UserId;
  readonly completedAt: Date;
}

export interface PasswordResetExpiredPayload {
  readonly passwordResetId: PasswordResetId;
  readonly userId: UserId;
  readonly expiredAt: Date;
}

export interface PasswordResetCancelledPayload {
  readonly passwordResetId: PasswordResetId;
  readonly userId: UserId;
  readonly cancelledAt: Date;
}

export class PasswordResetInitiated extends DomainEvent {
  readonly eventType = EventCatalog.PASSWORD_RESET_INITIATED;

  constructor(
    props: DomainEventProps,
    readonly passwordResetId: PasswordResetId,
    readonly userId: UserId,
    readonly token: string,
    readonly expiresAt: Date,
    readonly resendCount: number,
    readonly initiatedAt: Date,
  ) {
    super(props);
  }
}

export class PasswordResetCompleted extends DomainEvent {
  readonly eventType = EventCatalog.PASSWORD_RESET_COMPLETED;

  constructor(
    props: DomainEventProps,
    readonly passwordResetId: PasswordResetId,
    readonly userId: UserId,
    readonly completedAt: Date,
  ) {
    super(props);
  }
}

export class PasswordResetExpired extends DomainEvent {
  readonly eventType = EventCatalog.PASSWORD_RESET_EXPIRED;

  constructor(
    props: DomainEventProps,
    readonly passwordResetId: PasswordResetId,
    readonly userId: UserId,
    readonly expiredAt: Date,
  ) {
    super(props);
  }
}

export class PasswordResetCancelled extends DomainEvent {
  readonly eventType = EventCatalog.PASSWORD_RESET_CANCELLED;

  constructor(
    props: DomainEventProps,
    readonly passwordResetId: PasswordResetId,
    readonly userId: UserId,
    readonly cancelledAt: Date,
  ) {
    super(props);
  }
}

export const PasswordResetEventTypeMap = {
  initiated: EventCatalog.PASSWORD_RESET_INITIATED,
  completed: EventCatalog.PASSWORD_RESET_COMPLETED,
  expired: EventCatalog.PASSWORD_RESET_EXPIRED,
  cancelled: EventCatalog.PASSWORD_RESET_CANCELLED,
} as const;
