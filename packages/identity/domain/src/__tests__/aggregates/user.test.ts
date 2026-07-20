import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { User } from '../../aggregates/user';
import { UserDeletedError, UserLockedError, UserSuspendedError } from '../../errors';
import {
  UserActivated,
  UserDeleted,
  UserEmailVerified,
  UserLocked,
  UserMfaDisabled,
  UserMfaEnabled,
  UserPasswordAuthDisabled,
  UserPasswordAuthEnabled,
  UserProfileUpdated,
  UserRegistered,
  UserRestored,
  UserReactivated,
  UserSuspended,
  UserUnlocked,
} from '../../events/user-events';
import {
  AvatarUrl,
  DisplayName,
  EmailAddress,
  Locale,
  Timezone,
  UserId,
} from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';

const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validEmail = (): EmailAddress => EmailAddress.fromRaw('alice@relcko.io');
const validDisplayName = (): DisplayName => new DisplayName('Alice');
const validLocale = (): Locale => new Locale('en-US');
const validTimezone = (): Timezone => new Timezone('UTC');
const validAvatar = (): AvatarUrl => new AvatarUrl('https://cdn.relcko.io/avatar.png');

function createUser(overrides?: {
  id?: UserId;
  email?: EmailAddress;
  displayName?: DisplayName;
  locale?: Locale;
  timezone?: Timezone;
}): User {
  return User.register(
    overrides?.id ?? validUserId(),
    overrides?.email ?? validEmail(),
    overrides?.displayName ?? validDisplayName(),
    overrides?.locale ?? validLocale(),
    overrides?.timezone ?? validTimezone(),
    nextEventId(),
    at(T0),
  );
}

function createActiveUser(): User {
  const user = createUser();
  user.activate(nextEventId(), at(T1));
  return user;
}

describe('User Aggregate — Factory: register()', () => {
  it('creates a user with inactive status', () => {
    const user = createUser();
    expect(user.status.value).toBe('inactive');
  });

  it('sets email, displayName, locale, and timezone', () => {
    const id = validUserId();
    const email = validEmail();
    const displayName = validDisplayName();
    const locale = validLocale();
    const timezone = validTimezone();
    const user = User.register(id, email, displayName, locale, timezone, nextEventId(), at(T0));

    expect(user.id).toBe(id);
    expect(user.email).toBe(email);
    expect(user.displayName).toBe(displayName);
    expect(user.locale).toBe(locale);
    expect(user.timezone).toBe(timezone);
  });

  it('emits UserRegistered event with correct payload', () => {
    const id = validUserId();
    const email = validEmail();
    const displayName = validDisplayName();
    const locale = validLocale();
    const timezone = validTimezone();
    const eventId = nextEventId();
    const user = User.register(id, email, displayName, locale, timezone, eventId, at(T0));

    const events = user.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as UserRegistered;
    expect(event).toBeInstanceOf(UserRegistered);
    expect(event.eventType).toBe('identity.user.registered');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateId).toBe(id.toString());
    expect(event.aggregateType).toBe('User');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.userId).toBe(id);
    expect(event.email).toBe(email);
    expect(event.displayName).toBe(displayName);
    expect(event.locale).toBe(locale);
    expect(event.timezone).toBe(timezone);
    expect(event.registeredAt).toEqual(at(T0));
  });

  it('starts at version 1 after registration', () => {
    const user = createUser();
    expect(user.version).toBe(1);
  });

  it('initializes emailVerified, passwordAuthEnabled, mfaEnabled to false', () => {
    const user = createUser();
    expect(user.emailVerified).toBe(false);
    expect(user.passwordAuthEnabled).toBe(false);
    expect(user.mfaEnabled).toBe(false);
  });

  it('initializes avatarUrl, suspensionReason, deletedAt to null', () => {
    const user = createUser();
    expect(user.avatarUrl).toBeNull();
    expect(user.suspensionReason).toBeNull();
    expect(user.deletedAt).toBeNull();
  });

  it('sets registeredAt', () => {
    const user = createUser();
    expect(user.registeredAt).toEqual(at(T0));
  });
});

describe('User Aggregate — activate()', () => {
  it('transitions from inactive to active', () => {
    const user = createUser();
    user.activate(nextEventId(), at(T1));
    expect(user.status.isActive).toBe(true);
  });

  it('emits UserActivated event', () => {
    const user = createUser();
    const eventId = nextEventId();
    user.activate(eventId, at(T1));

    const events = user.getUncommittedEvents();
    const event = events[1] as UserActivated;
    expect(event).toBeInstanceOf(UserActivated);
    expect(event.eventType).toBe('identity.user.activated');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(2);
    expect(event.activatedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const user = createUser();
    user.activate(nextEventId(), at(T1));
    expect(user.version).toBe(2);
  });

  it('sets activatedAt', () => {
    const user = createUser();
    user.activate(nextEventId(), at(T1));
    expect(user.activatedAt).toEqual(at(T1));
  });

  it('throws when already active', () => {
    const user = createActiveUser();
    expect(() => {
      user.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when suspended', () => {
    const user = createActiveUser();
    user.suspend('violation', nextEventId(), at(T2));
    expect(() => {
      user.activate(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(() => {
      user.activate(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.activate(nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — suspend()', () => {
  it('transitions from active to suspended', () => {
    const user = createActiveUser();
    user.suspend('policy violation', nextEventId(), at(T2));
    expect(user.status.isSuspended).toBe(true);
  });

  it('emits UserSuspended event with reason', () => {
    const user = createActiveUser();
    const eventId = nextEventId();
    user.suspend('policy violation', eventId, at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserSuspended;
    expect(event).toBeInstanceOf(UserSuspended);
    expect(event.eventType).toBe('identity.user.suspended');
    expect(event.reason).toBe('policy violation');
    expect(event.suspendedAt).toEqual(at(T2));
  });

  it('sets suspensionReason and suspendedAt', () => {
    const user = createActiveUser();
    user.suspend('abuse', nextEventId(), at(T2));
    expect(user.suspensionReason).toBe('abuse');
    expect(user.suspendedAt).toEqual(at(T2));
  });

  it('throws when already suspended', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    expect(() => {
      user.suspend('again', nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when inactive (not yet activated)', () => {
    const user = createUser();
    expect(() => {
      user.suspend('reason', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(() => {
      user.suspend('reason', nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.suspend('reason', nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — reactivate()', () => {
  it('transitions from suspended to active', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    user.reactivate(nextEventId(), at(T3));
    expect(user.status.isActive).toBe(true);
  });

  it('emits UserReactivated event', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    const eventId = nextEventId();
    user.reactivate(eventId, at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserReactivated;
    expect(event).toBeInstanceOf(UserReactivated);
    expect(event.eventType).toBe('identity.user.reactivated');
    expect(event.reactivatedAt).toEqual(at(T3));
  });

  it('clears suspensionReason and suspendedAt', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    user.reactivate(nextEventId(), at(T3));
    expect(user.suspensionReason).toBeNull();
    expect(user.suspendedAt).toBeNull();
  });

  it('throws when not suspended', () => {
    const user = createActiveUser();
    expect(() => {
      user.reactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.reactivate(nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — lock()', () => {
  it('transitions from active to locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(user.status.isLocked).toBe(true);
  });

  it('emits UserLocked event', () => {
    const user = createActiveUser();
    const eventId = nextEventId();
    user.lock(eventId, at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserLocked;
    expect(event).toBeInstanceOf(UserLocked);
    expect(event.eventType).toBe('identity.user.locked');
    expect(event.lockedAt).toEqual(at(T2));
  });

  it('sets lockedAt', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(user.lockedAt).toEqual(at(T2));
  });

  it('throws when already locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(() => {
      user.lock(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when inactive', () => {
    const user = createUser();
    expect(() => {
      user.lock(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when suspended', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    expect(() => {
      user.lock(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.lock(nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — unlock()', () => {
  it('transitions from locked to active', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    user.unlock(nextEventId(), at(T3));
    expect(user.status.isActive).toBe(true);
  });

  it('emits UserUnlocked event', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    const eventId = nextEventId();
    user.unlock(eventId, at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserUnlocked;
    expect(event).toBeInstanceOf(UserUnlocked);
    expect(event.eventType).toBe('identity.user.unlocked');
    expect(event.unlockedAt).toEqual(at(T3));
  });

  it('clears lockedAt', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    user.unlock(nextEventId(), at(T3));
    expect(user.lockedAt).toBeNull();
  });

  it('throws when not locked', () => {
    const user = createActiveUser();
    expect(() => {
      user.unlock(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.unlock(nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — softDelete()', () => {
  it('transitions to deleted from active', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(user.status.isDeleted).toBe(true);
  });

  it('transitions to deleted from suspended', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    user.softDelete(nextEventId(), at(T3));
    expect(user.status.isDeleted).toBe(true);
  });

  it('transitions to deleted from locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    user.softDelete(nextEventId(), at(T3));
    expect(user.status.isDeleted).toBe(true);
  });

  it('emits UserDeleted event', () => {
    const user = createActiveUser();
    const eventId = nextEventId();
    user.softDelete(eventId, at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserDeleted;
    expect(event).toBeInstanceOf(UserDeleted);
    expect(event.eventType).toBe('identity.user.deleted');
    expect(event.deletedAt).toEqual(at(T2));
  });

  it('sets deletedAt', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(user.deletedAt).toEqual(at(T2));
  });

  it('throws when already deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.softDelete(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — restore()', () => {
  it('transitions from deleted to inactive', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    user.restore(nextEventId(), at(T3));
    expect(user.status.isInactive).toBe(true);
  });

  it('requires explicit activation after restore', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    user.restore(nextEventId(), at(T3));
    user.activate(nextEventId(), at(T4));
    expect(user.status.isActive).toBe(true);
  });

  it('emits UserRestored event', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    const eventId = nextEventId();
    user.restore(eventId, at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserRestored;
    expect(event).toBeInstanceOf(UserRestored);
    expect(event.eventType).toBe('identity.user.restored');
    expect(event.restoredAt).toEqual(at(T3));
  });

  it('clears deletedAt', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    user.restore(nextEventId(), at(T3));
    expect(user.deletedAt).toBeNull();
  });

  it('throws when not deleted', () => {
    const user = createActiveUser();
    expect(() => {
      user.restore(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — changeDisplayName()', () => {
  it('updates displayName when active', () => {
    const user = createActiveUser();
    const newName = new DisplayName('Bob');
    user.changeDisplayName(newName, nextEventId(), at(T2));
    expect(user.displayName).toBe(newName);
  });

  it('emits UserProfileUpdated event with displayName', () => {
    const user = createActiveUser();
    user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserProfileUpdated;
    expect(event).toBeInstanceOf(UserProfileUpdated);
    expect(event.eventType).toBe('identity.user.profile.updated');
    expect(event.displayName?.value).toBe('Bob');
    expect(event.avatarUrl).toBeUndefined();
    expect(event.locale).toBeUndefined();
    expect(event.timezone).toBeUndefined();
  });

  it('is a no-op when displayName is unchanged', () => {
    const user = createActiveUser();
    user.changeDisplayName(user.displayName, nextEventId(), at(T2));
    expect(user.getUncommittedEvents()).toHaveLength(2);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });

  it('throws when suspended', () => {
    const user = createActiveUser();
    user.suspend('reason', nextEventId(), at(T2));
    expect(() => {
      user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T3));
    }).toThrow(UserSuspendedError);
  });

  it('throws when locked', () => {
    const user = createActiveUser();
    user.lock(nextEventId(), at(T2));
    expect(() => {
      user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T3));
    }).toThrow(UserLockedError);
  });

  it('throws when inactive', () => {
    const user = createUser();
    expect(() => {
      user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — changeLocale()', () => {
  it('updates locale when active', () => {
    const user = createActiveUser();
    const newLocale = new Locale('fr-FR');
    user.changeLocale(newLocale, nextEventId(), at(T2));
    expect(user.locale).toBe(newLocale);
  });

  it('emits UserProfileUpdated with locale only', () => {
    const user = createActiveUser();
    user.changeLocale(new Locale('fr-FR'), nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserProfileUpdated;
    expect(event.locale?.value).toBe('fr-FR');
    expect(event.displayName).toBeUndefined();
  });

  it('is a no-op when locale is unchanged', () => {
    const user = createActiveUser();
    user.changeLocale(user.locale, nextEventId(), at(T2));
    expect(user.getUncommittedEvents()).toHaveLength(2);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.changeLocale(new Locale('fr-FR'), nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — changeTimezone()', () => {
  it('updates timezone when active', () => {
    const user = createActiveUser();
    const newTz = new Timezone('Europe/London');
    user.changeTimezone(newTz, nextEventId(), at(T2));
    expect(user.timezone).toBe(newTz);
  });

  it('emits UserProfileUpdated with timezone only', () => {
    const user = createActiveUser();
    user.changeTimezone(new Timezone('Europe/London'), nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserProfileUpdated;
    expect(event.timezone?.value).toBe('Europe/London');
    expect(event.displayName).toBeUndefined();
  });

  it('is a no-op when timezone is unchanged', () => {
    const user = createActiveUser();
    user.changeTimezone(user.timezone, nextEventId(), at(T2));
    expect(user.getUncommittedEvents()).toHaveLength(2);
  });
});

describe('User Aggregate — changeAvatar()', () => {
  it('sets avatar when active', () => {
    const user = createActiveUser();
    const avatar = validAvatar();
    user.changeAvatar(avatar, nextEventId(), at(T2));
    expect(user.avatarUrl).toBe(avatar);
  });

  it('removes avatar when passing null', () => {
    const user = createActiveUser();
    user.changeAvatar(validAvatar(), nextEventId(), at(T2));
    user.changeAvatar(null, nextEventId(), at(T3));
    expect(user.avatarUrl).toBeNull();
  });

  it('emits UserProfileUpdated with avatarUrl', () => {
    const user = createActiveUser();
    const avatar = validAvatar();
    user.changeAvatar(avatar, nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserProfileUpdated;
    expect(event.avatarUrl).toBe(avatar);
  });

  it('emits UserProfileUpdated with null when removing', () => {
    const user = createActiveUser();
    user.changeAvatar(validAvatar(), nextEventId(), at(T2));
    user.changeAvatar(null, nextEventId(), at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserProfileUpdated;
    expect(event.avatarUrl).toBeNull();
  });

  it('is a no-op when avatar is unchanged', () => {
    const user = createActiveUser();
    user.changeAvatar(validAvatar(), nextEventId(), at(T2));
    user.changeAvatar(user.avatarUrl, nextEventId(), at(T3));
    expect(user.getUncommittedEvents()).toHaveLength(3);
  });

  it('is a no-op when avatar is already null and passing null', () => {
    const user = createActiveUser();
    user.changeAvatar(null, nextEventId(), at(T2));
    expect(user.getUncommittedEvents()).toHaveLength(2);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.changeAvatar(validAvatar(), nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — verifyEmail()', () => {
  it('sets emailVerified to true', () => {
    const user = createActiveUser();
    user.verifyEmail(nextEventId(), at(T2));
    expect(user.emailVerified).toBe(true);
  });

  it('emits UserEmailVerified event', () => {
    const user = createActiveUser();
    user.verifyEmail(nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserEmailVerified;
    expect(event).toBeInstanceOf(UserEmailVerified);
    expect(event.eventType).toBe('identity.user.email.verified');
  });

  it('throws when already verified', () => {
    const user = createActiveUser();
    user.verifyEmail(nextEventId(), at(T2));
    expect(() => {
      user.verifyEmail(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const user = createActiveUser();
    user.softDelete(nextEventId(), at(T2));
    expect(() => {
      user.verifyEmail(nextEventId(), at(T3));
    }).toThrow(UserDeletedError);
  });
});

describe('User Aggregate — enablePasswordAuth()', () => {
  it('sets passwordAuthEnabled to true', () => {
    const user = createActiveUser();
    user.enablePasswordAuth(nextEventId(), at(T2));
    expect(user.passwordAuthEnabled).toBe(true);
  });

  it('emits UserPasswordAuthEnabled event', () => {
    const user = createActiveUser();
    user.enablePasswordAuth(nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserPasswordAuthEnabled;
    expect(event).toBeInstanceOf(UserPasswordAuthEnabled);
    expect(event.eventType).toBe('identity.user.password_auth.enabled');
  });

  it('throws when already enabled', () => {
    const user = createActiveUser();
    user.enablePasswordAuth(nextEventId(), at(T2));
    expect(() => {
      user.enablePasswordAuth(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — disablePasswordAuth()', () => {
  it('sets passwordAuthEnabled to false', () => {
    const user = createActiveUser();
    user.enablePasswordAuth(nextEventId(), at(T2));
    user.disablePasswordAuth(nextEventId(), at(T3));
    expect(user.passwordAuthEnabled).toBe(false);
  });

  it('emits UserPasswordAuthDisabled event', () => {
    const user = createActiveUser();
    user.enablePasswordAuth(nextEventId(), at(T2));
    user.disablePasswordAuth(nextEventId(), at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserPasswordAuthDisabled;
    expect(event).toBeInstanceOf(UserPasswordAuthDisabled);
    expect(event.eventType).toBe('identity.user.password_auth.disabled');
  });

  it('throws when already disabled', () => {
    const user = createActiveUser();
    expect(() => {
      user.disablePasswordAuth(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — enableMfa()', () => {
  it('sets mfaEnabled to true', () => {
    const user = createActiveUser();
    user.enableMfa(nextEventId(), at(T2));
    expect(user.mfaEnabled).toBe(true);
  });

  it('emits UserMfaEnabled event', () => {
    const user = createActiveUser();
    user.enableMfa(nextEventId(), at(T2));

    const events = user.getUncommittedEvents();
    const event = events[2] as UserMfaEnabled;
    expect(event).toBeInstanceOf(UserMfaEnabled);
    expect(event.eventType).toBe('identity.user.mfa.enabled');
  });

  it('throws when already enabled', () => {
    const user = createActiveUser();
    user.enableMfa(nextEventId(), at(T2));
    expect(() => {
      user.enableMfa(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — disableMfa()', () => {
  it('sets mfaEnabled to false', () => {
    const user = createActiveUser();
    user.enableMfa(nextEventId(), at(T2));
    user.disableMfa(nextEventId(), at(T3));
    expect(user.mfaEnabled).toBe(false);
  });

  it('emits UserMfaDisabled event', () => {
    const user = createActiveUser();
    user.enableMfa(nextEventId(), at(T2));
    user.disableMfa(nextEventId(), at(T3));

    const events = user.getUncommittedEvents();
    const event = events[3] as UserMfaDisabled;
    expect(event).toBeInstanceOf(UserMfaDisabled);
    expect(event.eventType).toBe('identity.user.mfa.disabled');
  });

  it('throws when already disabled', () => {
    const user = createActiveUser();
    expect(() => {
      user.disableMfa(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('User Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createActiveUser();
    original.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T2));
    original.changeAvatar(validAvatar(), nextEventId(), at(T3));
    original.enableMfa(nextEventId(), at(T4));
    original.verifyEmail(nextEventId(), at(T4));

    const history = original.getUncommittedEvents();
    const rebuilt = User.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.email.toString()).toBe(original.email.toString());
    expect(rebuilt.displayName.value).toBe('Bob');
    expect(rebuilt.avatarUrl?.value).toBe(original.avatarUrl?.value);
    expect(rebuilt.mfaEnabled).toBe(true);
    expect(rebuilt.emailVerified).toBe(true);
    expect(rebuilt.status.value).toBe(original.status.value);
  });

  it('rebuilds suspended state from history', () => {
    const original = createActiveUser();
    original.suspend('abuse', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = User.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.status.isSuspended).toBe(true);
    expect(rebuilt.suspensionReason).toBe('abuse');
    expect(rebuilt.suspendedAt).toEqual(at(T2));
  });

  it('rebuilds deleted state from history', () => {
    const original = createActiveUser();
    original.softDelete(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = User.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.status.isDeleted).toBe(true);
    expect(rebuilt.deletedAt).toEqual(at(T2));
  });

  it('rebuilds restored state as inactive from history', () => {
    const original = createActiveUser();
    original.softDelete(nextEventId(), at(T2));
    original.restore(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = User.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.status.isInactive).toBe(true);
    expect(rebuilt.deletedAt).toBeNull();
  });

  it('rebuilds locked-then-unlocked state from history', () => {
    const original = createActiveUser();
    original.lock(nextEventId(), at(T2));
    original.unlock(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = User.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.status.isActive).toBe(true);
    expect(rebuilt.lockedAt).toBeNull();
  });

  it('produces identical state across multiple replays', () => {
    const original = createActiveUser();
    original.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T2));
    original.enableMfa(nextEventId(), at(T3));
    original.suspend('test', nextEventId(), at(T4));

    const history = original.getUncommittedEvents();

    const first = User.reconstitute(original.id);
    first.loadFromHistory(history);

    const second = User.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.displayName.value).toBe(second.displayName.value);
    expect(first.mfaEnabled).toBe(second.mfaEnabled);
    expect(first.status.value).toBe(second.status.value);
  });
});

describe('User Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createActiveUser();
    original.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T2));
    original.changeAvatar(validAvatar(), nextEventId(), at(T3));
    original.enablePasswordAuth(nextEventId(), at(T3));
    original.enableMfa(nextEventId(), at(T3));
    original.verifyEmail(nextEventId(), at(T3));

    const snapshot = original.toSnapshot();
    const restored = User.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.email.toString()).toBe(original.email.toString());
    expect(restored.displayName.value).toBe(original.displayName.value);
    expect(restored.avatarUrl?.value).toBe(original.avatarUrl?.value);
    expect(restored.locale.value).toBe(original.locale.value);
    expect(restored.timezone.value).toBe(original.timezone.value);
    expect(restored.status.value).toBe(original.status.value);
    expect(restored.emailVerified).toBe(original.emailVerified);
    expect(restored.passwordAuthEnabled).toBe(original.passwordAuthEnabled);
    expect(restored.mfaEnabled).toBe(original.mfaEnabled);
    expect(restored.registeredAt.toISOString()).toBe(original.registeredAt.toISOString());
    expect(restored.activatedAt?.toISOString()).toBe(original.activatedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes deleted state correctly', () => {
    const original = createActiveUser();
    original.softDelete(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = User.fromSnapshot(snapshot);

    expect(restored.status.isDeleted).toBe(true);
    expect(restored.deletedAt?.toISOString()).toBe(at(T2).toISOString());
  });

  it('serializes restored state as inactive', () => {
    const original = createActiveUser();
    original.softDelete(nextEventId(), at(T2));
    original.restore(nextEventId(), at(T3));

    const snapshot = original.toSnapshot();
    const restored = User.fromSnapshot(snapshot);

    expect(restored.status.isInactive).toBe(true);
    expect(restored.deletedAt).toBeNull();
  });

  it('serializes suspended state correctly', () => {
    const original = createActiveUser();
    original.suspend('violation', nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = User.fromSnapshot(snapshot);

    expect(restored.status.isSuspended).toBe(true);
    expect(restored.suspensionReason).toBe('violation');
  });

  it('snapshot with null avatarUrl round-trips correctly', () => {
    const original = createActiveUser();
    const snapshot = original.toSnapshot();
    const restored = User.fromSnapshot(snapshot);
    expect(restored.avatarUrl).toBeNull();
  });
});

describe('User Aggregate — Equality', () => {
  it('two users with same id are equal', () => {
    const id = validUserId();
    const a = User.register(
      id,
      validEmail(),
      validDisplayName(),
      validLocale(),
      validTimezone(),
      nextEventId(),
      at(T0),
    );
    const b = User.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two users with different ids are not equal', () => {
    const a = createUser();
    const b = createUser();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const user = createUser();
    expect(user.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const user = createUser();
    expect(user.equals(undefined)).toBe(false);
  });
});

describe('User Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const user = createActiveUser();
    user.changeDisplayName(new DisplayName('Bob'), nextEventId(), at(T2));
    expect(user.getUncommittedEvents()).toHaveLength(3);

    user.markEventsAsCommitted();
    expect(user.getUncommittedEvents()).toHaveLength(0);
    expect(user.version).toBe(3);
  });
});

describe('User Aggregate — Full lifecycle integration', () => {
  it('supports full lifecycle: register → activate → suspend → reactivate → lock → unlock → delete → restore', () => {
    const user = createUser();

    user.activate(nextEventId(), at(T1));
    expect(user.status.isActive).toBe(true);

    user.suspend('test', nextEventId(), at(T2));
    expect(user.status.isSuspended).toBe(true);

    user.reactivate(nextEventId(), at(T3));
    expect(user.status.isActive).toBe(true);

    user.lock(nextEventId(), at(T3));
    expect(user.status.isLocked).toBe(true);

    user.unlock(nextEventId(), at(T4));
    expect(user.status.isActive).toBe(true);

    user.softDelete(nextEventId(), at(T4));
    expect(user.status.isDeleted).toBe(true);

    user.restore(nextEventId(), at(T4));
    expect(user.status.isInactive).toBe(true);

    user.activate(nextEventId(), at(T4));
    expect(user.status.isActive).toBe(true);

    expect(user.version).toBe(9);
    expect(user.getUncommittedEvents()).toHaveLength(9);
  });

  it('supports profile + settings changes in sequence', () => {
    const user = createActiveUser();

    user.changeDisplayName(new DisplayName('Alice2'), nextEventId(), at(T2));
    user.changeLocale(new Locale('de-DE'), nextEventId(), at(T2));
    user.changeTimezone(new Timezone('Europe/Berlin'), nextEventId(), at(T2));
    user.changeAvatar(validAvatar(), nextEventId(), at(T2));
    user.verifyEmail(nextEventId(), at(T2));
    user.enablePasswordAuth(nextEventId(), at(T2));
    user.enableMfa(nextEventId(), at(T2));

    expect(user.displayName.value).toBe('Alice2');
    expect(user.locale.value).toBe('de-DE');
    expect(user.timezone.value).toBe('Europe/Berlin');
    expect(user.avatarUrl?.value).toBe('https://cdn.relcko.io/avatar.png');
    expect(user.emailVerified).toBe(true);
    expect(user.passwordAuthEnabled).toBe(true);
    expect(user.mfaEnabled).toBe(true);
    expect(user.version).toBe(9);
  });
});
