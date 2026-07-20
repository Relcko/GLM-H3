import type { UserId } from '../value-objects';

export interface LockoutStatus {
  readonly isLocked: boolean;
  readonly remainingAttempts: number;
  readonly lockedUntil?: Date;
}

export interface ILockoutPolicy {
  recordFailedAttempt(userId: UserId): Promise<LockoutStatus>;
  recordSuccessfulAttempt(userId: UserId): Promise<void>;
  getLockoutStatus(userId: UserId): Promise<LockoutStatus>;
  isLockedOut(userId: UserId): Promise<boolean>;
  releaseLock(userId: UserId): Promise<void>;
}
