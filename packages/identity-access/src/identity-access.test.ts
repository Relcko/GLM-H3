import { describe, it, expect } from 'vitest';
import { systemClock } from '@relcko/kernel';

// User aggregate tests
import { User, UserStatus } from './aggregates/user';

describe('User Aggregate', () => {
  describe('create', () => {
    it('should create a user in pending status', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.status).toBe(UserStatus.Pending);
      expect(user.emailVerified).toBe(false);
      expect(user.mfaEnabled).toBe(false);
      expect(user.roles).toEqual([]);
    });

    it('should normalize email to lowercase', () => {
      const user = User.create({ email: 'Test@Example.COM', username: 'testuser', passwordHash: 'hash123' });
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and activate user', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.verifyEmail('test@example.com');
      expect(user.emailVerified).toBe(true);
      expect(user.status).toBe(UserStatus.Active);
    });
  });

  describe('password management', () => {
    it('should change password', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.changePassword('newhash456');
      expect(user.passwordHash).toBe('newhash456');
    });
  });

  describe('MFA', () => {
    it('should enroll MFA with backup codes', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.enrollMfa('SECRETKEY', ['code1', 'code2', 'code3', 'code4', 'code5']);
      expect(user.mfaEnabled).toBe(true);
      expect(user.totpSecret).toBe('SECRETKEY');
      expect(user.backupCodeHashes).toHaveLength(5);
    });
  });

  describe('lifecycle', () => {
    it('should suspend and reactivate', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.verifyEmail('test@example.com');
      expect(user.status).toBe(UserStatus.Active);
      user.suspend('violation');
      expect(user.status).toBe(UserStatus.Suspended);
      user.reactivate();
      expect(user.status).toBe(UserStatus.Active);
    });
  });

  describe('roles', () => {
    it('should assign and revoke roles', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.assignRole('admin', 'system');
      expect(user.roles).toContain('admin');
      user.revokeRole('admin', 'system');
      expect(user.roles).not.toContain('admin');
    });
  });

  describe('fromHistory', () => {
    it('should rebuild from events', () => {
      const user = User.create({ email: 'test@example.com', username: 'testuser', passwordHash: 'hash123' });
      user.verifyEmail('test@example.com');
      user.assignRole('admin', 'system');
      const _events = user.getUncommittedEvents();
      user.markEventsAsCommitted();
      const rebuilt = User.fromHistory(user.id, _events);
      expect(rebuilt.email).toBe('test@example.com');
      expect(rebuilt.emailVerified).toBe(true);
      expect(rebuilt.roles).toContain('admin');
    });
  });
});

// Session aggregate tests
import { Session, SessionStatus } from './aggregates/session';

describe('Session Aggregate', () => {
  it('should create an active session', () => {
    const session = Session.create({
      userId: 'usr_1', accessTokenHash: 'access_hash', refreshTokenHash: 'refresh_hash',
      expiresAt: new Date(Date.now() + 3600000),
    });
    expect(session.userId).toBe('usr_1');
    expect(session.status).toBe(SessionStatus.Active);
  });

  it('should refresh session with rotation', () => {
    const session = Session.create({
      userId: 'usr_1', accessTokenHash: 'access_hash', refreshTokenHash: 'refresh_hash',
      expiresAt: new Date(Date.now() + 3600000),
    });
    session.refresh({ newAccessTokenHash: 'new_access', newRefreshTokenHash: 'new_refresh', newExpiresAt: new Date(Date.now() + 7200000) });
    expect(session.accessTokenHash).toBe('new_access');
    expect(session.refreshTokenHash).toBe('new_refresh');
  });

  it('should revoke session', () => {
    const session = Session.create({
      userId: 'usr_1', accessTokenHash: 'access_hash', refreshTokenHash: 'refresh_hash',
      expiresAt: new Date(Date.now() + 3600000),
    });
    session.revoke('logout');
    expect(session.status).toBe(SessionStatus.Revoked);
  });
});

// Organization aggregate tests
import { Organization, OrganizationStatus } from './aggregates/organization';

describe('Organization Aggregate', () => {
  it('should create organization with creator as member', () => {
    const org = Organization.create({ name: 'Test Corp', createdBy: 'usr_1' });
    expect(org.name).toBe('Test Corp');
    expect(org.status).toBe(OrganizationStatus.Active);
    expect(org.isMember('usr_1')).toBe(true);
    expect(org.members).toHaveLength(1);
  });

  it('should invite member', () => {
    const org = Organization.create({ name: 'Test Corp', createdBy: 'usr_1' });
    const invite = org.inviteMember({ email: 'new@example.com', role: 'member', invitedBy: 'usr_1', ttlMs: 604800000 });
    expect(invite.status).toBe('pending');
    expect(invite.email).toBe('new@example.com');
  });

  it('should remove member', () => {
    const org = Organization.create({ name: 'Test Corp', createdBy: 'usr_1' });
    org.removeMember('usr_1', 'admin_user');
    expect(org.isMember('usr_1')).toBe(false);
  });
});

// ServiceAccount aggregate tests
import { ServiceAccount, ServiceAccountStatus } from './aggregates/service-account';

describe('ServiceAccount Aggregate', () => {
  it('should create and disable/enable', () => {
    const sa = ServiceAccount.create({ name: 'API Bot', organizationId: 'org_1', keyHash: 'key_hash' });
    expect(sa.status).toBe(ServiceAccountStatus.Active);
    sa.disable();
    expect(sa.status).toBe(ServiceAccountStatus.Disabled);
    sa.enable();
    expect(sa.status).toBe(ServiceAccountStatus.Active);
  });
});

// AuthenticationAttempt aggregate tests
import { AuthenticationAttempt } from './aggregates/authentication-attempt';

describe('AuthenticationAttempt Aggregate', () => {
  it('should record successful authentication', () => {
    const attempt = AuthenticationAttempt.recordSuccess({ userId: 'usr_1', method: 'password', identifier: 'test@example.com', previousConsecutiveFailures: 2 });
    expect(attempt.success).toBe(true);
    expect(attempt.consecutiveFailures).toBe(0);
  });

  it('should lock account after max attempts', () => {
    const attempt = AuthenticationAttempt.recordFailure({
      userId: 'usr_1', method: 'password', identifier: 'test@example.com', reason: 'invalid_credentials',
      previousConsecutiveFailures: 4, maxAttempts: 5, lockoutDurationMs: 900000,
    });
    expect(attempt.consecutiveFailures).toBe(5);
    expect(attempt.isLocked()).toBe(true);
  });
});

// EmailVerification aggregate tests
import { EmailVerification, VerificationStatus } from './aggregates/email-verification';

describe('EmailVerification Aggregate', () => {
  it('should request and verify', () => {
    const ev = EmailVerification.request({ userId: 'usr_1', email: 'test@example.com', tokenHash: 'token_hash', ttlMs: 3600000 });
    expect(ev.status).toBe(VerificationStatus.Pending);
    ev.verify('usr_1', 'test@example.com');
    expect(ev.status).toBe(VerificationStatus.Verified);
  });
});

// PasswordReset aggregate tests
import { PasswordReset, PasswordResetStatus } from './aggregates/password-reset';

describe('PasswordReset Aggregate', () => {
  it('should request and complete', () => {
    const pr = PasswordReset.request({ userId: 'usr_1', tokenHash: 'token_hash', ttlMs: 1800000 });
    expect(pr.status).toBe(PasswordResetStatus.Pending);
    pr.complete('new_hash_456');
    expect(pr.status).toBe(PasswordResetStatus.Completed);
  });
});

// RoleDefinition aggregate tests
import { RoleDefinition } from './aggregates/role-definition';

describe('RoleDefinition Aggregate', () => {
  it('should create and manage permissions', () => {
    const rd = RoleDefinition.create({ name: 'admin', description: 'System administrator', permissions: ['*'], isPlatform: true });
    expect(rd.name).toBe('admin');
    expect(rd.isPlatform).toBe(true);
    rd.grantPermission('content.read');
    expect(rd.hasPermission('content.read')).toBe(true);
    rd.revokePermission('content.read');
    expect(rd.hasPermission('content.read')).toBe(false);
  });
});

// Value Object tests
import { Email, TotpSecret, BackupCode } from './value-objects';

describe('Value Objects', () => {
  describe('Email', () => {
    it('should normalize case', () => {
      const email = Email.fromRaw('Test@Example.COM');
      expect(email.value).toBe('test@example.com');
    });
  });

  describe('TotpSecret', () => {
    it('should generate valid secret', () => {
      const secret = TotpSecret.generate();
      expect(secret.value).toHaveLength(20);
    });
  });

  describe('BackupCode', () => {
    it('should generate valid backup code', () => {
      const code = BackupCode.generate();
      expect(code.value).toHaveLength(10);
    });
  });
});

// Specification tests
import { lockoutSpec, passwordPolicySpec } from './specifications';

describe('Specifications', () => {
  describe('lockoutSpec', () => {
    it('should detect lockout after max failures', () => {
      const spec = lockoutSpec(5, 900000);
      const now = Date.now();
      expect(spec.isSatisfiedBy({
        consecutiveFailures: 5, lastAttemptAt: new Date(now - 10000),
        clock: { nowMs: () => now, now: () => new Date(now) },
      })).toBe(true);
    });
  });

  describe('passwordPolicySpec', () => {
    it('should accept strong passwords', () => {
      expect(passwordPolicySpec().isSatisfiedBy('StrongPass1')).toBe(true);
    });
    it('should reject short passwords', () => {
      expect(passwordPolicySpec().isSatisfiedBy('Sh0rt')).toBe(false);
    });
  });
});

// Domain Events catalog tests
import { IdentityAccessEventCatalog } from './events';

describe('Domain Events Catalog', () => {
  it('should have all required event types', () => {
    expect(IdentityAccessEventCatalog.UserRegistered).toBeDefined();
    expect(IdentityAccessEventCatalog.SessionCreated).toBeDefined();
    expect(IdentityAccessEventCatalog.AuthenticationSucceeded).toBeDefined();
    expect(IdentityAccessEventCatalog.AuthenticationFailed).toBeDefined();
    expect(IdentityAccessEventCatalog.AccountLocked).toBeDefined();
  });
});

// Services tests
import { TotpService } from './services';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => mockLogger };

describe('TotpService', () => {
  it('should generate and verify TOTP codes', () => {
    const service = new TotpService({ logger: mockLogger as never, clock: systemClock });
    const secret = service.generateSecret();
    const code = service.generateCode(secret);
    expect(service.verify(secret, code)).toBe(true);
  });

  it('should reject invalid TOTP code', () => {
    const service = new TotpService({ logger: mockLogger as never, clock: systemClock });
    expect(service.verify('SECRET_KEY_ABCDEFGH', '000000')).toBe(false);
  });

  it('should generate unique backup codes', () => {
    const service = new TotpService({ logger: mockLogger as never, clock: systemClock });
    const codes = service.generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });
});

// Test fixtures tests
import { createTestUser, createVerifiedUser, createUserWithMfa, createTestOrganization } from './test-fixtures';

describe('Test Fixtures', () => {
  it('should create test user', () => {
    const user = createTestUser();
    expect(user.email).toBe('test@example.com');
  });

  it('should create verified user', () => {
    const user = createVerifiedUser();
    expect(user.emailVerified).toBe(true);
  });

  it('should create user with MFA', () => {
    const user = createUserWithMfa({ totpSecret: 'MY_SECRET' });
    expect(user.mfaEnabled).toBe(true);
  });

  it('should create test organization', () => {
    const org = createTestOrganization({ name: 'MyOrg' });
    expect(org.name).toBe('MyOrg');
  });
});
