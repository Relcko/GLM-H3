import type { DisplayName, EmailAddress, UserId } from '../value-objects';

export interface RegisterUserCommand {
  readonly email: EmailAddress;
  readonly displayName: DisplayName;
  readonly passwordHash?: string;
}

export interface UpdateUserProfileCommand {
  readonly userId: UserId;
  readonly displayName?: DisplayName;
  readonly avatarUrl?: string;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface SuspendUserCommand {
  readonly userId: UserId;
  readonly reason: string;
}

export interface ReactivateUserCommand {
  readonly userId: UserId;
}

export interface DeleteUserCommand {
  readonly userId: UserId;
  readonly reason?: string;
}
