import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { AuthenticationFactor, AuthenticationMethod } from '../value-objects';
import type { AttemptId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface AuthenticationAttemptRecordedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly startedAt: Date;
}

export interface AuthenticationAttemptMethodRecordedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly method: AuthenticationMethod;
}

export interface AuthenticationAttemptMfaRequiredPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly factor: AuthenticationFactor;
}

export interface AuthenticationAttemptMfaChallengeBegunPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly begunAt: Date;
}

export interface AuthenticationAttemptMfaChallengeCompletedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly completedAt: Date;
}

export interface AuthenticationAttemptMfaFailedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly reason: string;
  readonly failedAt: Date;
}

export interface AuthenticationSucceededPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly method: AuthenticationMethod | null;
  readonly succeededAt: Date;
}

export interface AuthenticationFailedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly method: AuthenticationMethod | null;
  readonly failureReason: string;
  readonly failedAt: Date;
}

export interface AuthenticationAttemptLockoutTriggeredPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly triggeredAt: Date;
}

export interface AuthenticationAttemptThrottleTriggeredPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly triggeredAt: Date;
}

export interface AuthenticationAttemptRiskScoreRecordedPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly riskScore: number;
}

export interface AuthenticationAttemptExpiredPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly expiredAt: Date;
}

export interface AuthenticationAttemptCancelledPayload {
  readonly attemptId: AttemptId;
  readonly userId: UserId | null;
  readonly reason: string;
  readonly cancelledAt: Date;
}

export class AuthenticationAttemptRecorded extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_RECORDED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly startedAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptMethodRecorded extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_METHOD_RECORDED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly method: AuthenticationMethod,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptMfaRequired extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_MFA_REQUIRED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly factor: AuthenticationFactor,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptMfaChallengeBegun extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_MFA_CHALLENGE_BEGUN;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly begunAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptMfaChallengeCompleted extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_MFA_CHALLENGE_COMPLETED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly completedAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptMfaFailed extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_MFA_FAILED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly reason: string,
    readonly failedAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationSucceeded extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_SUCCEEDED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly method: AuthenticationMethod | null,
    readonly succeededAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationFailed extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_FAILED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly method: AuthenticationMethod | null,
    readonly failureReason: string,
    readonly failedAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptLockoutTriggered extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_LOCKOUT_TRIGGERED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly triggeredAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptThrottleTriggered extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_THROTTLE_TRIGGERED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly triggeredAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptRiskScoreRecorded extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_RISK_SCORE_RECORDED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly riskScore: number,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptExpired extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_EXPIRED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly expiredAt: Date,
  ) {
    super(props);
  }
}

export class AuthenticationAttemptCancelled extends DomainEvent {
  readonly eventType = EventCatalog.AUTHENTICATION_ATTEMPT_CANCELLED;

  constructor(
    props: DomainEventProps,
    readonly attemptId: AttemptId,
    readonly userId: UserId | null,
    readonly reason: string,
    readonly cancelledAt: Date,
  ) {
    super(props);
  }
}

export const AuthenticationAttemptEventTypeMap = {
  recorded: EventCatalog.AUTHENTICATION_ATTEMPT_RECORDED,
  methodRecorded: EventCatalog.AUTHENTICATION_ATTEMPT_METHOD_RECORDED,
  mfaRequired: EventCatalog.AUTHENTICATION_ATTEMPT_MFA_REQUIRED,
  mfaChallengeBegun: EventCatalog.AUTHENTICATION_ATTEMPT_MFA_CHALLENGE_BEGUN,
  mfaChallengeCompleted: EventCatalog.AUTHENTICATION_ATTEMPT_MFA_CHALLENGE_COMPLETED,
  mfaFailed: EventCatalog.AUTHENTICATION_ATTEMPT_MFA_FAILED,
  succeeded: EventCatalog.AUTHENTICATION_SUCCEEDED,
  failed: EventCatalog.AUTHENTICATION_FAILED,
  lockoutTriggered: EventCatalog.AUTHENTICATION_ATTEMPT_LOCKOUT_TRIGGERED,
  throttleTriggered: EventCatalog.AUTHENTICATION_ATTEMPT_THROTTLE_TRIGGERED,
  riskScoreRecorded: EventCatalog.AUTHENTICATION_ATTEMPT_RISK_SCORE_RECORDED,
  expired: EventCatalog.AUTHENTICATION_ATTEMPT_EXPIRED,
  cancelled: EventCatalog.AUTHENTICATION_ATTEMPT_CANCELLED,
} as const;
