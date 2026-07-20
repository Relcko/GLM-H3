import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { EmailVerificationId, EmailAddress, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface EmailVerificationInitiatedPayload {
  readonly emailVerificationId: EmailVerificationId;
  readonly userId: UserId;
  readonly email: EmailAddress;
  readonly token: string;
  readonly expiresAt: Date;
  readonly resendCount: number;
  readonly initiatedAt: Date;
}

export interface EmailVerificationCompletedPayload {
  readonly emailVerificationId: EmailVerificationId;
  readonly userId: UserId;
  readonly email: EmailAddress;
  readonly completedAt: Date;
}

export interface EmailVerificationFailedPayload {
  readonly emailVerificationId: EmailVerificationId;
  readonly userId: UserId;
  readonly email: EmailAddress;
  readonly failureReason: string;
  readonly failedAt: Date;
}

export class EmailVerificationInitiated extends DomainEvent {
  readonly eventType = EventCatalog.EMAIL_VERIFICATION_INITIATED;

  constructor(
    props: DomainEventProps,
    readonly emailVerificationId: EmailVerificationId,
    readonly userId: UserId,
    readonly email: EmailAddress,
    readonly token: string,
    readonly expiresAt: Date,
    readonly resendCount: number,
    readonly initiatedAt: Date,
  ) {
    super(props);
  }
}

export class EmailVerificationCompleted extends DomainEvent {
  readonly eventType = EventCatalog.EMAIL_VERIFICATION_COMPLETED;

  constructor(
    props: DomainEventProps,
    readonly emailVerificationId: EmailVerificationId,
    readonly userId: UserId,
    readonly email: EmailAddress,
    readonly completedAt: Date,
  ) {
    super(props);
  }
}

export class EmailVerificationFailed extends DomainEvent {
  readonly eventType = EventCatalog.EMAIL_VERIFICATION_FAILED;

  constructor(
    props: DomainEventProps,
    readonly emailVerificationId: EmailVerificationId,
    readonly userId: UserId,
    readonly email: EmailAddress,
    readonly failureReason: string,
    readonly failedAt: Date,
  ) {
    super(props);
  }
}

export const EmailVerificationEventTypeMap = {
  initiated: EventCatalog.EMAIL_VERIFICATION_INITIATED,
  completed: EventCatalog.EMAIL_VERIFICATION_COMPLETED,
  failed: EventCatalog.EMAIL_VERIFICATION_FAILED,
} as const;
