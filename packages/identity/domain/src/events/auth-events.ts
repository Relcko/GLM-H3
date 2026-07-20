import { EventCatalog } from './event-catalog';

import type { AttemptId, UserId } from '../value-objects';

export interface AuthenticationSucceededPayload {
  readonly attemptId?: AttemptId;
  readonly userId: UserId;
  readonly method: string;
  readonly succeededAt: Date;
}

export interface AuthenticationFailedPayload {
  readonly attemptId?: AttemptId;
  readonly userId?: UserId;
  readonly method: string;
  readonly failureReason: string;
  readonly failedAt: Date;
}

export interface EmailVerificationInitiatedPayload {
  readonly userId: UserId;
  readonly email: string;
  readonly initiatedAt: Date;
}

export interface EmailVerificationCompletedPayload {
  readonly userId: UserId;
  readonly email: string;
  readonly completedAt: Date;
}

export interface EmailVerificationFailedPayload {
  readonly userId: UserId;
  readonly email: string;
  readonly failureReason: string;
  readonly failedAt: Date;
}

export interface PasswordResetInitiatedPayload {
  readonly userId: UserId;
  readonly initiatedAt: Date;
  readonly expiresAt: Date;
}

export interface PasswordResetCompletedPayload {
  readonly userId: UserId;
  readonly completedAt: Date;
}

export interface PasswordResetExpiredPayload {
  readonly userId: UserId;
  readonly expiredAt: Date;
}

export const AuthEventTypeMap = {
  authenticationSucceeded: EventCatalog.AUTHENTICATION_SUCCEEDED,
  authenticationFailed: EventCatalog.AUTHENTICATION_FAILED,
  emailVerificationInitiated: EventCatalog.EMAIL_VERIFICATION_INITIATED,
  emailVerificationCompleted: EventCatalog.EMAIL_VERIFICATION_COMPLETED,
  emailVerificationFailed: EventCatalog.EMAIL_VERIFICATION_FAILED,
  passwordResetInitiated: EventCatalog.PASSWORD_RESET_INITIATED,
  passwordResetCompleted: EventCatalog.PASSWORD_RESET_COMPLETED,
  passwordResetExpired: EventCatalog.PASSWORD_RESET_EXPIRED,
} as const;
