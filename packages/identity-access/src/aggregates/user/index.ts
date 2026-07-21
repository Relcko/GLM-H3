import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  UserRegisteredEvent,
  UserEmailVerifiedEvent,
  UserPasswordChangedEvent,
  UserMfaEnrolledEvent,
  UserMfaDisabledEvent,
  UserBackupCodesGeneratedEvent,
  UserBackupCodeUsedEvent,
  UserSuspendedEvent,
  UserReactivatedEvent,
  UserRoleAssignedEvent,
  UserRoleRevokedEvent,
} from '../../events';

export enum UserStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Closed = 'closed',
}

export interface UserState {
  id: EntityId;
  email: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  totpSecret: string | null;
  backupCodeHashes: readonly string[];
  roles: readonly string[];
  createdAt: Date;
  updatedAt: Date;
}

function initialState(id: EntityId): UserState {
  const now = systemClock.now();
  return {
    id,
    email: '',
    username: '',
    passwordHash: '',
    status: UserStatus.Pending,
    emailVerified: false,
    mfaEnabled: false,
    totpSecret: null,
    backupCodeHashes: [],
    roles: [],
    createdAt: now,
    updatedAt: now,
  };
}

export class User extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'User';
  private state: UserState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static create(params: {
    id?: EntityId;
    email: string;
    username: string;
    passwordHash: string;
    clock?: Clock;
  }): User {
    const user = new User(params.id ?? generateId('usr'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    user.apply(new UserRegisteredEvent(
      String(user.id),
      user.nextVersion(),
      occurredAt,
      params.email.toLowerCase().trim(),
      params.username,
      params.passwordHash,
    ));
    return user;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): User {
    const user = new User(id);
    user.loadFromHistory(events);
    return user;
  }

  get email(): string { return this.state.email; }
  get username(): string { return this.state.username; }
  get passwordHash(): string { return this.state.passwordHash; }
  get status(): UserStatus { return this.state.status; }
  get emailVerified(): boolean { return this.state.emailVerified; }
  get mfaEnabled(): boolean { return this.state.mfaEnabled; }
  get totpSecret(): string | null { return this.state.totpSecret; }
  get backupCodeHashes(): readonly string[] { return this.state.backupCodeHashes; }
  get roles(): readonly string[] { return this.state.roles; }
  get createdAt(): Date { return this.state.createdAt; }
  get updatedAt(): Date { return this.state.updatedAt; }

  isActive(): boolean { return this.state.status === UserStatus.Active; }
  isSuspended(): boolean { return this.state.status === UserStatus.Suspended; }

  verifyEmail(email: string, clock?: Clock): void {
    this.assertNotClosed();
    const occurredAt = clock?.now() ?? systemClock.now();
    if (this.state.emailVerified && this.state.email === email.toLowerCase().trim()) {
      return;
    }
    this.apply(new UserEmailVerifiedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      email.toLowerCase().trim(),
    ));
  }

  changePassword(newPasswordHash: string, clock?: Clock): void {
    this.assertNotClosed();
    if (!newPasswordHash) throw new InvariantViolationError('User', String(this.id), 'empty-password-hash');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserPasswordChangedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      newPasswordHash,
    ));
  }

  enrollMfa(totpSecret: string, backupCodeHashes: readonly string[], clock?: Clock): void {
    this.assertNotClosed();
    if (this.state.mfaEnabled) throw new InvariantViolationError('User', String(this.id), 'mfa-already-enabled');
    if (backupCodeHashes.length < 5) throw new InvariantViolationError('User', String(this.id), 'insufficient-backup-codes');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserMfaEnrolledEvent(
      String(this.id), this.nextVersion(), occurredAt,
      totpSecret, backupCodeHashes,
    ));
  }

  disableMfa(clock?: Clock): void {
    this.assertNotClosed();
    if (!this.state.mfaEnabled) throw new InvariantViolationError('User', String(this.id), 'mfa-not-enabled');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserMfaDisabledEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  useBackupCode(codeHash: string, clock?: Clock): void {
    this.assertNotClosed();
    if (!this.state.mfaEnabled) throw new InvariantViolationError('User', String(this.id), 'mfa-not-enabled');
    const idx = this.state.backupCodeHashes.indexOf(codeHash);
    if (idx === -1) throw new InvariantViolationError('User', String(this.id), 'invalid-backup-code');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserBackupCodeUsedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      this.state.backupCodeHashes.length - 1,
    ));
  }

  regenerateBackupCodes(backupCodeHashes: readonly string[], clock?: Clock): void {
    this.assertNotClosed();
    if (!this.state.mfaEnabled) throw new InvariantViolationError('User', String(this.id), 'mfa-not-enabled');
    if (backupCodeHashes.length < 5) throw new InvariantViolationError('User', String(this.id), 'insufficient-backup-codes');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserBackupCodesGeneratedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      backupCodeHashes,
    ));
  }

  suspend(reason: string, clock?: Clock): void {
    if (this.state.status === UserStatus.Suspended) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserSuspendedEvent(
      String(this.id), this.nextVersion(), occurredAt, reason,
    ));
  }

  reactivate(clock?: Clock): void {
    if (this.state.status !== UserStatus.Suspended) throw new InvariantViolationError('User', String(this.id), 'not-suspended');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserReactivatedEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  assignRole(role: string, assignedBy: string, clock?: Clock): void {
    this.assertNotClosed();
    if (this.state.roles.includes(role)) throw new InvariantViolationError('User', String(this.id), 'role-already-assigned');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserRoleAssignedEvent(
      String(this.id), this.nextVersion(), occurredAt, role, assignedBy,
    ));
  }

  revokeRole(role: string, revokedBy: string, clock?: Clock): void {
    this.assertNotClosed();
    if (!this.state.roles.includes(role)) throw new InvariantViolationError('User', String(this.id), 'role-not-assigned');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new UserRoleRevokedEvent(
      String(this.id), this.nextVersion(), occurredAt, role, revokedBy,
    ));
  }

  private assertNotClosed(): void {
    if (this.state.status === UserStatus.Closed) {
      throw new InvariantViolationError('User', String(this.id), 'user-closed');
    }
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.user.registered': {
        const e = event as UserRegisteredEvent;
        this.state.email = e.email;
        this.state.username = e.username;
        this.state.passwordHash = e.passwordHash;
        this.state.status = UserStatus.Pending;
        this.state.emailVerified = false;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.email_verified': {
        const e = event as UserEmailVerifiedEvent;
        this.state.email = e.email;
        this.state.emailVerified = true;
        if (this.state.status === UserStatus.Pending) {
          this.state.status = UserStatus.Active;
        }
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.password_changed': {
        const e = event as UserPasswordChangedEvent;
        this.state.passwordHash = e.newPasswordHash;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.mfa_enrolled': {
        const e = event as UserMfaEnrolledEvent;
        this.state.mfaEnabled = true;
        this.state.totpSecret = e.totpSecret;
        this.state.backupCodeHashes = e.backupCodeHashes;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.mfa_disabled': {
        const e = event as UserMfaDisabledEvent;
        this.state.mfaEnabled = false;
        this.state.totpSecret = null;
        this.state.backupCodeHashes = [];
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.backup_codes_generated': {
        const e = event as UserBackupCodesGeneratedEvent;
        this.state.backupCodeHashes = e.backupCodeHashes;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.backup_code_used': {
        const e = event as UserBackupCodeUsedEvent;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.suspended': {
        const e = event as UserSuspendedEvent;
        this.state.status = UserStatus.Suspended;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.reactivated': {
        const e = event as UserReactivatedEvent;
        this.state.status = UserStatus.Active;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.role_assigned': {
        const e = event as UserRoleAssignedEvent;
        if (!this.state.roles.includes(e.role)) {
          this.state.roles = [...this.state.roles, e.role];
        }
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.user.role_revoked': {
        const e = event as UserRoleRevokedEvent;
        this.state.roles = this.state.roles.filter((r) => r !== e.role);
        this.state.updatedAt = e.occurredAt;
        break;
      }
    }
  }
}
