import { EventCatalog } from './event-catalog';

import type { UserId, EmailAddress, DisplayName } from '../value-objects';

export interface UserRegisteredPayload {
  readonly userId: UserId;
  readonly email: EmailAddress;
  readonly displayName: DisplayName;
  readonly registeredAt: Date;
}

export interface UserProfileUpdatedPayload {
  readonly userId: UserId;
  readonly displayName?: DisplayName;
  readonly avatarUrl?: string;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface UserSuspendedPayload {
  readonly userId: UserId;
  readonly reason: string;
  readonly suspendedAt: Date;
}

export interface UserReactivatedPayload {
  readonly userId: UserId;
  readonly reactivatedAt: Date;
}

export interface UserDeletedPayload {
  readonly userId: UserId;
  readonly deletedAt: Date;
}

export const UserEventTypeMap = {
  registered: EventCatalog.USER_REGISTERED,
  profileUpdated: EventCatalog.USER_PROFILE_UPDATED,
  suspended: EventCatalog.USER_SUSPENDED,
  reactivated: EventCatalog.USER_REACTIVATED,
  deleted: EventCatalog.USER_DELETED,
} as const;
