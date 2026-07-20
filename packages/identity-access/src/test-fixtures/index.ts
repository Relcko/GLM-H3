import { User } from '../aggregates/user';
import { Session } from '../aggregates/session';
import { Organization } from '../aggregates/organization';
import { ServiceAccount } from '../aggregates/service-account';
import { AuthenticationAttempt } from '../aggregates/authentication-attempt';
import { EmailVerification } from '../aggregates/email-verification';
import { PasswordReset } from '../aggregates/password-reset';
import { RoleDefinition } from '../aggregates/role-definition';
import { systemClock, type Clock } from '@relcko/kernel';

export interface TestFixturesConfig {
  clock?: Clock;
}

export function createTestUser(params: {
  email?: string;
  username?: string;
  passwordHash?: string;
  clock?: Clock;
} = {}): User {
  return User.create({
    email: params.email ?? 'test@example.com',
    username: params.username ?? 'testuser',
    passwordHash: params.passwordHash ?? 'hashed_password_123',
    clock: params.clock ?? systemClock,
  });
}

export function createVerifiedUser(params: {
  email?: string;
  username?: string;
  passwordHash?: string;
  clock?: Clock;
} = {}): User {
  const user = createTestUser(params);
  user.verifyEmail(params.email ?? 'test@example.com', params.clock);
  return user;
}

export function createUserWithMfa(params: {
  email?: string;
  username?: string;
  passwordHash?: string;
  totpSecret?: string;
  clock?: Clock;
} = {}): User {
  const user = createVerifiedUser(params);
  const backupCodes = new Array(10).fill(0).map((_, i) => `backup_code_${i}`);
  user.enrollMfa(params.totpSecret ?? 'SECRETKEY123', backupCodes, params.clock);
  return user;
}

export function createUserWithRoles(params: {
  email?: string;
  username?: string;
  passwordHash?: string;
  roles?: string[];
  assignedBy?: string;
  clock?: Clock;
} = {}): User {
  const user = createVerifiedUser(params);
  for (const role of params.roles ?? []) {
    user.assignRole(role, params.assignedBy ?? 'system', params.clock);
  }
  return user;
}

export function createTestSession(params: {
  userId?: string;
  accessTokenHash?: string;
  refreshTokenHash?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
  clock?: Clock;
} = {}): Session {
  return Session.create({
    userId: params.userId ?? 'usr_test',
    accessTokenHash: params.accessTokenHash ?? 'access_hash_123',
    refreshTokenHash: params.refreshTokenHash ?? 'refresh_hash_123',
    deviceFingerprint: params.deviceFingerprint ?? 'device_fp_001',
    ipAddress: params.ipAddress ?? '127.0.0.1',
    userAgent: params.userAgent ?? 'TestAgent/1.0',
    expiresAt: params.expiresAt ?? new Date(systemClock.nowMs() + 3600000),
    clock: params.clock ?? systemClock,
  });
}

export function createTestOrganization(params: {
  name?: string;
  createdBy?: string;
  parentOrganizationId?: string;
  clock?: Clock;
} = {}): Organization {
  return Organization.create({
    name: params.name ?? 'Test Org',
    createdBy: params.createdBy ?? 'usr_test',
    parentOrganizationId: params.parentOrganizationId,
    clock: params.clock ?? systemClock,
  });
}

export function createTestServiceAccount(params: {
  name?: string;
  organizationId?: string;
  keyHash?: string;
  capabilities?: string[];
  clock?: Clock;
} = {}): ServiceAccount {
  return ServiceAccount.create({
    name: params.name ?? 'Test SA',
    organizationId: params.organizationId ?? 'org_test',
    keyHash: params.keyHash ?? 'key_hash_123',
    capabilities: params.capabilities ?? ['read', 'write'],
    clock: params.clock ?? systemClock,
  });
}

export function createTestAuthAttemptSuccess(params: {
  userId?: string;
  method?: string;
  identifier?: string;
  clock?: Clock;
} = {}): AuthenticationAttempt {
  return AuthenticationAttempt.recordSuccess({
    userId: params.userId ?? 'usr_test',
    method: params.method ?? 'password',
    identifier: params.identifier ?? 'test@example.com',
    previousConsecutiveFailures: 0,
    clock: params.clock ?? systemClock,
  });
}

export function createTestAuthAttemptFailure(params: {
  userId?: string | null;
  method?: string;
  identifier?: string;
  reason?: string;
  previousConsecutiveFailures?: number;
  maxAttempts?: number;
  lockoutDurationMs?: number;
  clock?: Clock;
} = {}): AuthenticationAttempt {
  return AuthenticationAttempt.recordFailure({
    userId: params.userId ?? 'usr_test',
    method: params.method ?? 'password',
    identifier: params.identifier ?? 'test@example.com',
    reason: params.reason ?? 'invalid_credentials',
    previousConsecutiveFailures: params.previousConsecutiveFailures ?? 0,
    maxAttempts: params.maxAttempts ?? 5,
    lockoutDurationMs: params.lockoutDurationMs ?? 900000,
    clock: params.clock ?? systemClock,
  });
}

export function createTestEmailVerification(params: {
  userId?: string;
  email?: string;
  tokenHash?: string;
  ttlMs?: number;
  clock?: Clock;
} = {}): EmailVerification {
  return EmailVerification.request({
    userId: params.userId ?? 'usr_test',
    email: params.email ?? 'test@example.com',
    tokenHash: params.tokenHash ?? 'ev_token_hash_123',
    ttlMs: params.ttlMs ?? 3600000,
    clock: params.clock ?? systemClock,
  });
}

export function createTestPasswordReset(params: {
  userId?: string;
  tokenHash?: string;
  ttlMs?: number;
  clock?: Clock;
} = {}): PasswordReset {
  return PasswordReset.request({
    userId: params.userId ?? 'usr_test',
    tokenHash: params.tokenHash ?? 'pr_token_hash_123',
    ttlMs: params.ttlMs ?? 1800000,
    clock: params.clock ?? systemClock,
  });
}

export function createTestRoleDefinition(params: {
  name?: string;
  description?: string;
  permissions?: string[];
  isPlatform?: boolean;
  clock?: Clock;
} = {}): RoleDefinition {
  return RoleDefinition.create({
    name: params.name ?? 'test_role',
    description: params.description ?? 'A test role definition',
    permissions: params.permissions ?? ['read', 'write'],
    isPlatform: params.isPlatform ?? false,
    clock: params.clock ?? systemClock,
  });
}

export function createTestPlatformRoles(): RoleDefinition[] {
  return [
    RoleDefinition.create({ name: 'admin', description: 'Platform administrator', permissions: ['*'], isPlatform: true, clock: systemClock }),
    RoleDefinition.create({ name: 'investor', description: 'Investor role', permissions: ['browse', 'invest', 'portfolio.read'], isPlatform: true, clock: systemClock }),
    RoleDefinition.create({ name: 'manager', description: 'Manager role', permissions: ['browse', 'users.manage', 'roles.read'], isPlatform: true, clock: systemClock }),
    RoleDefinition.create({ name: 'compliance', description: 'Compliance officer', permissions: ['browse', 'kyc.review', 'audit.read'], isPlatform: true, clock: systemClock }),
  ];
}
