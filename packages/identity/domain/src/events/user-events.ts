import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type {
  AvatarUrl,
  DisplayName,
  EmailAddress,
  Locale,
  Timezone,
  UserId,
} from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface UserRegisteredPayload {
  readonly userId: UserId;
  readonly email: EmailAddress;
  readonly displayName: DisplayName;
  readonly locale: Locale;
  readonly timezone: Timezone;
  readonly registeredAt: Date;
}

export interface UserActivatedPayload {
  readonly userId: UserId;
  readonly activatedAt: Date;
}

export interface UserProfileUpdatedPayload {
  readonly userId: UserId;
  readonly displayName?: DisplayName;
  readonly avatarUrl?: AvatarUrl | null;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
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

export interface UserLockedPayload {
  readonly userId: UserId;
  readonly lockedAt: Date;
}

export interface UserUnlockedPayload {
  readonly userId: UserId;
  readonly unlockedAt: Date;
}

export interface UserDeletedPayload {
  readonly userId: UserId;
  readonly deletedAt: Date;
}

export interface UserRestoredPayload {
  readonly userId: UserId;
  readonly restoredAt: Date;
}

export interface UserEmailVerifiedPayload {
  readonly userId: UserId;
  readonly verifiedAt: Date;
}

export interface UserPasswordAuthEnabledPayload {
  readonly userId: UserId;
  readonly enabledAt: Date;
}

export interface UserPasswordAuthDisabledPayload {
  readonly userId: UserId;
  readonly disabledAt: Date;
}

export interface UserMfaEnabledPayload {
  readonly userId: UserId;
  readonly enabledAt: Date;
}

export interface UserMfaDisabledPayload {
  readonly userId: UserId;
  readonly disabledAt: Date;
}

export class UserRegistered extends DomainEvent {
  readonly eventType = EventCatalog.USER_REGISTERED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly email: EmailAddress,
    readonly displayName: DisplayName,
    readonly locale: Locale,
    readonly timezone: Timezone,
    readonly registeredAt: Date,
  ) {
    super(props);
  }
}

export class UserActivated extends DomainEvent {
  readonly eventType = EventCatalog.USER_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class UserProfileUpdated extends DomainEvent {
  readonly eventType = EventCatalog.USER_PROFILE_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly displayName?: DisplayName,
    readonly avatarUrl?: AvatarUrl | null,
    readonly locale?: Locale,
    readonly timezone?: Timezone,
  ) {
    super(props);
  }
}

export class UserSuspended extends DomainEvent {
  readonly eventType = EventCatalog.USER_SUSPENDED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly reason: string,
    readonly suspendedAt: Date,
  ) {
    super(props);
  }
}

export class UserReactivated extends DomainEvent {
  readonly eventType = EventCatalog.USER_REACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly reactivatedAt: Date,
  ) {
    super(props);
  }
}

export class UserLocked extends DomainEvent {
  readonly eventType = EventCatalog.USER_LOCKED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly lockedAt: Date,
  ) {
    super(props);
  }
}

export class UserUnlocked extends DomainEvent {
  readonly eventType = EventCatalog.USER_UNLOCKED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly unlockedAt: Date,
  ) {
    super(props);
  }
}

export class UserDeleted extends DomainEvent {
  readonly eventType = EventCatalog.USER_DELETED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly deletedAt: Date,
  ) {
    super(props);
  }
}

export class UserRestored extends DomainEvent {
  readonly eventType = EventCatalog.USER_RESTORED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly restoredAt: Date,
  ) {
    super(props);
  }
}

export class UserEmailVerified extends DomainEvent {
  readonly eventType = EventCatalog.USER_EMAIL_VERIFIED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly verifiedAt: Date,
  ) {
    super(props);
  }
}

export class UserPasswordAuthEnabled extends DomainEvent {
  readonly eventType = EventCatalog.USER_PASSWORD_AUTH_ENABLED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly enabledAt: Date,
  ) {
    super(props);
  }
}

export class UserPasswordAuthDisabled extends DomainEvent {
  readonly eventType = EventCatalog.USER_PASSWORD_AUTH_DISABLED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly disabledAt: Date,
  ) {
    super(props);
  }
}

export class UserMfaEnabled extends DomainEvent {
  readonly eventType = EventCatalog.USER_MFA_ENABLED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly enabledAt: Date,
  ) {
    super(props);
  }
}

export class UserMfaDisabled extends DomainEvent {
  readonly eventType = EventCatalog.USER_MFA_DISABLED;

  constructor(
    props: DomainEventProps,
    readonly userId: UserId,
    readonly disabledAt: Date,
  ) {
    super(props);
  }
}

export const UserEventTypeMap = {
  registered: EventCatalog.USER_REGISTERED,
  activated: EventCatalog.USER_ACTIVATED,
  profileUpdated: EventCatalog.USER_PROFILE_UPDATED,
  suspended: EventCatalog.USER_SUSPENDED,
  reactivated: EventCatalog.USER_REACTIVATED,
  locked: EventCatalog.USER_LOCKED,
  unlocked: EventCatalog.USER_UNLOCKED,
  deleted: EventCatalog.USER_DELETED,
  restored: EventCatalog.USER_RESTORED,
  emailVerified: EventCatalog.USER_EMAIL_VERIFIED,
  passwordAuthEnabled: EventCatalog.USER_PASSWORD_AUTH_ENABLED,
  passwordAuthDisabled: EventCatalog.USER_PASSWORD_AUTH_DISABLED,
  mfaEnabled: EventCatalog.USER_MFA_ENABLED,
  mfaDisabled: EventCatalog.USER_MFA_DISABLED,
} as const;
