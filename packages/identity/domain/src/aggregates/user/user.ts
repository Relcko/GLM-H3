import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

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
import { UserStatus as UserStatusVO } from '../../value-objects';

import type { UserStatus } from '../../value-objects';
import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface UserSnapshot {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly locale: string;
  readonly timezone: string;
  readonly status: string;
  readonly emailVerified: boolean;
  readonly passwordAuthEnabled: boolean;
  readonly mfaEnabled: boolean;
  readonly suspensionReason: string | null;
  readonly registeredAt: string;
  readonly activatedAt: string | null;
  readonly suspendedAt: string | null;
  readonly lockedAt: string | null;
  readonly deletedAt: string | null;
  readonly version: number;
}

export class User extends AggregateRoot<UserId> {
  readonly aggregateType = 'User';

  private _email!: EmailAddress;
  private _displayName!: DisplayName;
  private _avatarUrl: AvatarUrl | null = null;
  private _locale!: Locale;
  private _timezone!: Timezone;
  private _status!: UserStatus;
  private _emailVerified = false;
  private _passwordAuthEnabled = false;
  private _mfaEnabled = false;
  private _suspensionReason: string | null = null;
  private _registeredAt!: Date;
  private _activatedAt: Date | null = null;
  private _suspendedAt: Date | null = null;
  private _lockedAt: Date | null = null;
  private _deletedAt: Date | null = null;

  private constructor(id: UserId) {
    super(id);
  }

  static register(
    id: UserId,
    email: EmailAddress,
    displayName: DisplayName,
    locale: Locale,
    timezone: Timezone,
    eventId: EventId,
    occurredAt: Date,
  ): User {
    const user = new User(id);
    user.apply(
      new UserRegistered(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: user.aggregateType,
          aggregateVersion: user.nextVersion(),
          occurredAt,
        },
        id,
        email,
        displayName,
        locale,
        timezone,
        occurredAt,
      ),
    );
    return user;
  }

  static fromSnapshot(snapshot: UserSnapshot): User {
    const user = new User(new UserId(snapshot.id));
    user._email = EmailAddress.fromRaw(snapshot.email);
    user._displayName = new DisplayName(snapshot.displayName);
    user._avatarUrl = snapshot.avatarUrl ? new AvatarUrl(snapshot.avatarUrl) : null;
    user._locale = new Locale(snapshot.locale);
    user._timezone = new Timezone(snapshot.timezone);
    user._status = new UserStatusVO(snapshot.status);
    user._emailVerified = snapshot.emailVerified;
    user._passwordAuthEnabled = snapshot.passwordAuthEnabled;
    user._mfaEnabled = snapshot.mfaEnabled;
    user._suspensionReason = snapshot.suspensionReason;
    user._registeredAt = new Date(snapshot.registeredAt);
    user._activatedAt = snapshot.activatedAt ? new Date(snapshot.activatedAt) : null;
    user._suspendedAt = snapshot.suspendedAt ? new Date(snapshot.suspendedAt) : null;
    user._lockedAt = snapshot.lockedAt ? new Date(snapshot.lockedAt) : null;
    user._deletedAt = snapshot.deletedAt ? new Date(snapshot.deletedAt) : null;
    user.restoreVersion(snapshot.version);
    return user;
  }

  static reconstitute(id: UserId): User {
    return new User(id);
  }

  get email(): EmailAddress {
    return this._email;
  }

  get displayName(): DisplayName {
    return this._displayName;
  }

  get avatarUrl(): AvatarUrl | null {
    return this._avatarUrl;
  }

  get locale(): Locale {
    return this._locale;
  }

  get timezone(): Timezone {
    return this._timezone;
  }

  get status(): UserStatus {
    return this._status;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get passwordAuthEnabled(): boolean {
    return this._passwordAuthEnabled;
  }

  get mfaEnabled(): boolean {
    return this._mfaEnabled;
  }

  get suspensionReason(): string | null {
    return this._suspensionReason;
  }

  get registeredAt(): Date {
    return this._registeredAt;
  }

  get activatedAt(): Date | null {
    return this._activatedAt;
  }

  get suspendedAt(): Date | null {
    return this._suspendedAt;
  }

  get lockedAt(): Date | null {
    return this._lockedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  activate(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (this._status.isActive) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-already-active',
        { currentStatus: this._status.value },
      );
    }
    if (!this._status.isInactive) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-activate-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'inactive' },
      );
    }
    this.apply(
      new UserActivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  suspend(reason: string, eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (this._status.isSuspended) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-already-suspended',
        { currentStatus: this._status.value },
      );
    }
    if (!this._status.isActive) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-suspend-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'active' },
      );
    }
    this.apply(
      new UserSuspended(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        reason,
        occurredAt,
      ),
    );
  }

  reactivate(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (!this._status.isSuspended) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-reactivate-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'suspended' },
      );
    }
    this.apply(
      new UserReactivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  lock(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (this._status.isLocked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-already-locked',
        { currentStatus: this._status.value },
      );
    }
    if (!this._status.isActive) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-lock-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'active' },
      );
    }
    this.apply(
      new UserLocked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  unlock(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (!this._status.isLocked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-unlock-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'locked' },
      );
    }
    this.apply(
      new UserUnlocked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  softDelete(eventId: EventId, occurredAt: Date): void {
    if (this._status.isDeleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-already-deleted',
        { currentStatus: this._status.value },
      );
    }
    this.apply(
      new UserDeleted(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  restore(eventId: EventId, occurredAt: Date): void {
    if (!this._status.isDeleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-restore-invalid-source-status',
        { currentStatus: this._status.value, requiredStatus: 'deleted' },
      );
    }
    this.apply(
      new UserRestored(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  changeDisplayName(displayName: DisplayName, eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._displayName.equals(displayName)) {
      return;
    }
    this.apply(
      new UserProfileUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        displayName,
      ),
    );
  }

  changeLocale(locale: Locale, eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._locale.equals(locale)) {
      return;
    }
    this.apply(
      new UserProfileUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        undefined,
        undefined,
        locale,
      ),
    );
  }

  changeTimezone(timezone: Timezone, eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._timezone.equals(timezone)) {
      return;
    }
    this.apply(
      new UserProfileUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        undefined,
        undefined,
        undefined,
        timezone,
      ),
    );
  }

  changeAvatar(avatarUrl: AvatarUrl | null, eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    const current = this._avatarUrl;
    if (current === null && avatarUrl === null) {
      return;
    }
    if (current !== null && avatarUrl !== null && current.equals(avatarUrl)) {
      return;
    }
    this.apply(
      new UserProfileUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        undefined,
        avatarUrl,
      ),
    );
  }

  verifyEmail(eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._emailVerified) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-email-already-verified',
        {},
      );
    }
    this.apply(
      new UserEmailVerified(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  enablePasswordAuth(eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._passwordAuthEnabled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-password-auth-already-enabled',
        {},
      );
    }
    this.apply(
      new UserPasswordAuthEnabled(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  disablePasswordAuth(eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (!this._passwordAuthEnabled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-password-auth-already-disabled',
        {},
      );
    }
    this.apply(
      new UserPasswordAuthDisabled(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  enableMfa(eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (this._mfaEnabled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-mfa-already-enabled',
        {},
      );
    }
    this.apply(
      new UserMfaEnabled(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  disableMfa(eventId: EventId, occurredAt: Date): void {
    this.requireActive();
    if (!this._mfaEnabled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'user-mfa-already-disabled',
        {},
      );
    }
    this.apply(
      new UserMfaDisabled(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.toString(),
      email: this._email.toString(),
      displayName: this._displayName.toString(),
      avatarUrl: this._avatarUrl?.toString() ?? null,
      locale: this._locale.toString(),
      timezone: this._timezone.toString(),
      status: this._status.toString(),
      emailVerified: this._emailVerified,
      passwordAuthEnabled: this._passwordAuthEnabled,
      mfaEnabled: this._mfaEnabled,
      suspensionReason: this._suspensionReason,
      registeredAt: this._registeredAt.toISOString(),
      activatedAt: this._activatedAt?.toISOString() ?? null,
      suspendedAt: this._suspendedAt?.toISOString() ?? null,
      lockedAt: this._lockedAt?.toISOString() ?? null,
      deletedAt: this._deletedAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof UserRegistered) {
      this._email = event.email;
      this._displayName = event.displayName;
      this._locale = event.locale;
      this._timezone = event.timezone;
      this._status = new UserStatusVO('inactive');
      this._registeredAt = event.registeredAt;
    } else if (event instanceof UserActivated) {
      this._status = new UserStatusVO('active');
      this._activatedAt = event.activatedAt;
    } else if (event instanceof UserProfileUpdated) {
      if (event.displayName !== undefined) {
        this._displayName = event.displayName;
      }
      if (event.avatarUrl !== undefined) {
        this._avatarUrl = event.avatarUrl;
      }
      if (event.locale !== undefined) {
        this._locale = event.locale;
      }
      if (event.timezone !== undefined) {
        this._timezone = event.timezone;
      }
    } else if (event instanceof UserSuspended) {
      this._status = new UserStatusVO('suspended');
      this._suspensionReason = event.reason;
      this._suspendedAt = event.suspendedAt;
    } else if (event instanceof UserReactivated) {
      this._status = new UserStatusVO('active');
      this._suspensionReason = null;
      this._suspendedAt = null;
    } else if (event instanceof UserLocked) {
      this._status = new UserStatusVO('locked');
      this._lockedAt = event.lockedAt;
    } else if (event instanceof UserUnlocked) {
      this._status = new UserStatusVO('active');
      this._lockedAt = null;
    } else if (event instanceof UserDeleted) {
      this._status = new UserStatusVO('deleted');
      this._deletedAt = event.deletedAt;
    } else if (event instanceof UserRestored) {
      this._status = new UserStatusVO('inactive');
      this._deletedAt = null;
    } else if (event instanceof UserEmailVerified) {
      this._emailVerified = true;
    } else if (event instanceof UserPasswordAuthEnabled) {
      this._passwordAuthEnabled = true;
    } else if (event instanceof UserPasswordAuthDisabled) {
      this._passwordAuthEnabled = false;
    } else if (event instanceof UserMfaEnabled) {
      this._mfaEnabled = true;
    } else if (event instanceof UserMfaDisabled) {
      this._mfaEnabled = false;
    }
  }

  private requireActive(): void {
    if (this._status.isDeleted) {
      throw new UserDeletedError(this.id.toString());
    }
    if (this._status.isSuspended) {
      throw new UserSuspendedError(this.id.toString(), this._suspensionReason ?? undefined);
    }
    if (this._status.isLocked) {
      throw new UserLockedError(this.id.toString());
    }
    if (!this._status.isActive) {
      throw new InvariantViolationError(this.aggregateType, this.id.toString(), 'user-not-active', {
        currentStatus: this._status.value,
      });
    }
  }

  private requireNotDeleted(): void {
    if (this._status.isDeleted) {
      throw new UserDeletedError(this.id.toString());
    }
  }
}
