import type { EmailAddress, UserId } from '../value-objects';

export interface RecordAuthenticationAttemptCommand {
  readonly userId?: UserId;
  readonly method: string;
  readonly success: boolean;
  readonly failureReason?: string;
}

export interface InitiateEmailVerificationCommand {
  readonly userId: UserId;
  readonly email: EmailAddress;
}

export interface CompleteEmailVerificationCommand {
  readonly userId: UserId;
  readonly token: string;
}

export interface InitiatePasswordResetCommand {
  readonly userId: UserId;
}

export interface CompletePasswordResetCommand {
  readonly userId: UserId;
  readonly token: string;
  readonly newPasswordHash: string;
}
