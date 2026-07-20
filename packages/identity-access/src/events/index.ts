import { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export const IdentityAccessEventCatalog = {
  // User events
  UserRegistered: 'identity-access.user.registered',
  UserEmailVerified: 'identity-access.user.email_verified',
  UserPasswordChanged: 'identity-access.user.password_changed',
  UserMfaEnrolled: 'identity-access.user.mfa_enrolled',
  UserMfaDisabled: 'identity-access.user.mfa_disabled',
  UserBackupCodesGenerated: 'identity-access.user.backup_codes_generated',
  UserBackupCodeUsed: 'identity-access.user.backup_code_used',
  UserSuspended: 'identity-access.user.suspended',
  UserReactivated: 'identity-access.user.reactivated',
  UserRoleAssigned: 'identity-access.user.role_assigned',
  UserRoleRevoked: 'identity-access.user.role_revoked',

  // Session events
  SessionCreated: 'identity-access.session.created',
  SessionRefreshed: 'identity-access.session.refreshed',
  SessionRevoked: 'identity-access.session.revoked',
  AllSessionsRevoked: 'identity-access.session.all_revoked',
  SessionExpired: 'identity-access.session.expired',
  DeviceTrusted: 'identity-access.session.device_trusted',

  // Organization events
  OrganizationCreated: 'identity-access.organization.created',
  OrganizationUpdated: 'identity-access.organization.updated',
  OrganizationArchived: 'identity-access.organization.archived',
  MemberInvited: 'identity-access.organization.member_invited',
  MemberAccepted: 'identity-access.organization.member_accepted',
  MemberRemoved: 'identity-access.organization.member_removed',
  OrganizationRoleAssigned: 'identity-access.organization.role_assigned',
  OrganizationRoleRevoked: 'identity-access.organization.role_revoked',

  // ServiceAccount events
  ServiceAccountCreated: 'identity-access.service_account.created',
  ServiceAccountEnabled: 'identity-access.service_account.enabled',
  ServiceAccountDisabled: 'identity-access.service_account.disabled',
  ServiceAccountRotated: 'identity-access.service_account.rotated',
  ServiceAccountCapabilityGranted: 'identity-access.service_account.capability_granted',
  ServiceAccountCapabilityRevoked: 'identity-access.service_account.capability_revoked',

  // AuthenticationAttempt events
  AuthenticationSucceeded: 'identity-access.auth_attempt.succeeded',
  AuthenticationFailed: 'identity-access.auth_attempt.failed',
  AccountLocked: 'identity-access.auth_attempt.account_locked',
  LockoutReset: 'identity-access.auth_attempt.lockout_reset',

  // EmailVerification events
  EmailVerificationRequested: 'identity-access.email_verification.requested',
  EmailVerified: 'identity-access.email_verification.verified',

  // PasswordReset events
  PasswordResetRequested: 'identity-access.password_reset.requested',
  PasswordResetCompleted: 'identity-access.password_reset.completed',
  PasswordResetExpired: 'identity-access.password_reset.expired',

  // RoleDefinition events
  RoleDefinitionCreated: 'identity-access.role_definition.created',
  RoleDefinitionUpdated: 'identity-access.role_definition.updated',
  PermissionGranted: 'identity-access.role_definition.permission_granted',
  PermissionRevoked: 'identity-access.role_definition.permission_revoked',
} as const;

export type IdentityAccessEventType = (typeof IdentityAccessEventCatalog)[keyof typeof IdentityAccessEventCatalog];

let eventIdCounter = 0;
function nextEventId(): EventId {
  eventIdCounter++;
  return `evt_${String(eventIdCounter).padStart(6, '0')}` as EventId;
}

// ---- User Events ----

export class UserRegisteredEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserRegistered;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly email: string,
    public readonly username: string,
    public readonly passwordHash: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserEmailVerifiedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserEmailVerified;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly email: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserPasswordChanged;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly newPasswordHash: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserMfaEnrolledEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserMfaEnrolled;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly totpSecret: string,
    public readonly backupCodeHashes: readonly string[],
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserMfaDisabledEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserMfaDisabled;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserBackupCodesGeneratedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserBackupCodesGenerated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly backupCodeHashes: readonly string[],
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserBackupCodeUsedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserBackupCodeUsed;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly remainingCount: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserSuspendedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserSuspended;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly reason: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserReactivatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserReactivated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserRoleAssignedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserRoleAssigned;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly role: string,
    public readonly assignedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

export class UserRoleRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.UserRoleRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly role: string,
    public readonly revokedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'User', aggregateVersion, occurredAt });
  }
}

// ---- Session Events ----

export class SessionCreatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.SessionCreated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly accessTokenHash: string,
    public readonly refreshTokenHash: string,
    public readonly deviceFingerprint: string | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly expiresAt: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

export class SessionRefreshedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.SessionRefreshed;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly newAccessTokenHash: string,
    public readonly newRefreshTokenHash: string,
    public readonly previousRefreshTokenHash: string,
    public readonly expiresAt: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

export class SessionRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.SessionRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly reason: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

export class AllSessionsRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.AllSessionsRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly reason: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

export class SessionExpiredEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.SessionExpired;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

export class DeviceTrustedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.DeviceTrusted;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly deviceFingerprint: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Session', aggregateVersion, occurredAt });
  }
}

// ---- Organization Events ----

export class OrganizationCreatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.OrganizationCreated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly name: string,
    public readonly createdBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class OrganizationUpdatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.OrganizationUpdated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly changedFields: readonly string[],
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class OrganizationArchivedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.OrganizationArchived;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class MemberInvitedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.MemberInvited;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly email: string,
    public readonly role: string,
    public readonly invitedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class MemberAcceptedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.MemberAccepted;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class MemberRemovedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.MemberRemoved;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly removedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class OrganizationRoleAssignedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.OrganizationRoleAssigned;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly role: string,
    public readonly assignedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

export class OrganizationRoleRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.OrganizationRoleRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly role: string,
    public readonly revokedBy: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'Organization', aggregateVersion, occurredAt });
  }
}

// ---- ServiceAccount Events ----

export class ServiceAccountCreatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountCreated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly name: string,
    public readonly organizationId: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

export class ServiceAccountEnabledEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountEnabled;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

export class ServiceAccountDisabledEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountDisabled;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

export class ServiceAccountRotatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountRotated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly newKeyHash: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

export class ServiceAccountCapabilityGrantedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountCapabilityGranted;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly capability: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

export class ServiceAccountCapabilityRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.ServiceAccountCapabilityRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly capability: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'ServiceAccount', aggregateVersion, occurredAt });
  }
}

// ---- AuthenticationAttempt Events ----

export class AuthenticationSucceededEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.AuthenticationSucceeded;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly method: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'AuthenticationAttempt', aggregateVersion, occurredAt });
  }
}

export class AuthenticationFailedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.AuthenticationFailed;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string | null,
    public readonly method: string,
    public readonly reason: string,
    public readonly consecutiveFailures: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'AuthenticationAttempt', aggregateVersion, occurredAt });
  }
}

export class AccountLockedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.AccountLocked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly lockedUntil: number,
    public readonly consecutiveFailures: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'AuthenticationAttempt', aggregateVersion, occurredAt });
  }
}

export class LockoutResetEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.LockoutReset;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'AuthenticationAttempt', aggregateVersion, occurredAt });
  }
}

// ---- EmailVerification Events ----

export class EmailVerificationRequestedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.EmailVerificationRequested;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly email: string,
    public readonly tokenHash: string,
    public readonly expiresAt: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'EmailVerification', aggregateVersion, occurredAt });
  }
}

export class EmailVerifiedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.EmailVerified;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly email: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'EmailVerification', aggregateVersion, occurredAt });
  }
}

// ---- PasswordReset Events ----

export class PasswordResetRequestedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.PasswordResetRequested;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly expiresAt: number,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'PasswordReset', aggregateVersion, occurredAt });
  }
}

export class PasswordResetCompletedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.PasswordResetCompleted;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
    public readonly newPasswordHash: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'PasswordReset', aggregateVersion, occurredAt });
  }
}

export class PasswordResetExpiredEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.PasswordResetExpired;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly userId: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'PasswordReset', aggregateVersion, occurredAt });
  }
}

// ---- RoleDefinition Events ----

export class RoleDefinitionCreatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.RoleDefinitionCreated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly name: string,
    public readonly description: string,
    public readonly permissions: readonly string[],
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'RoleDefinition', aggregateVersion, occurredAt });
  }
}

export class RoleDefinitionUpdatedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.RoleDefinitionUpdated;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly changedFields: readonly string[],
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'RoleDefinition', aggregateVersion, occurredAt });
  }
}

export class PermissionGrantedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.PermissionGranted;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly permission: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'RoleDefinition', aggregateVersion, occurredAt });
  }
}

export class PermissionRevokedEvent extends DomainEvent {
  public readonly eventType = IdentityAccessEventCatalog.PermissionRevoked;
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    occurredAt: Date,
    public readonly permission: string,
  ) {
    super({ eventId: nextEventId(), aggregateId, aggregateType: 'RoleDefinition', aggregateVersion, occurredAt });
  }
}
