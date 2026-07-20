import { describe, expect, it } from 'vitest';

import {
  EmailAlreadyLinkedError,
  EmailVerificationFailedError,
  IdentityDomainError,
  InvalidCredentialsError,
  MfaRequiredError,
  MfaVerificationFailedError,
  OrganizationAccessDeniedError,
  OrganizationNotFoundError,
  PasskeyNotFoundError,
  PasskeyRegistrationFailedError,
  PermissionDeniedError,
  PolicyEvaluationError,
  RecoveryAlreadyUsedError,
  RecoveryExpiredError,
  RecoveryNotFoundError,
  RoleAlreadyAssignedError,
  RoleAssignmentNotFoundError,
  RoleNotFoundError,
  ServiceAccountAccessDeniedError,
  ServiceAccountNotFoundError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
  TokenConsumedError,
  TokenExpiredError,
  TokenRevokedError,
  UserAlreadyExistsError,
  UserDeletedError,
  UserLockedError,
  UserNotFoundError,
  UserSuspendedError,
  WalletAlreadyLinkedError,
  WalletNotFoundError,
  WalletNotVerifiedError,
  WalletVerificationFailedError,
} from '../errors';

describe('Identity Domain Errors', () => {
  describe('IdentityDomainError base', () => {
    it('cannot be instantiated directly', () => {
      expect(() => {
        class TestError extends IdentityDomainError {
          constructor() {
            super('TEST', 'test');
          }
        }
        new TestError();
      }).not.toThrow(); // can create subclass
    });
  });

  describe('User errors', () => {
    it('UserNotFoundError', () => {
      const err = new UserNotFoundError('user-1');
      expect(err.code).toBe('IDENTITY_USER_NOT_FOUND');
      expect(err.message).toContain('user-1');
      expect(err.context.userId).toBe('user-1');
    });

    it('UserAlreadyExistsError', () => {
      const err = new UserAlreadyExistsError('test@test.com');
      expect(err.code).toBe('IDENTITY_USER_ALREADY_EXISTS');
      expect(err.context.email).toBe('test@test.com');
    });

    it('UserSuspendedError', () => {
      const err = new UserSuspendedError('user-1', 'violation');
      expect(err.code).toBe('IDENTITY_USER_SUSPENDED');
      expect(err.context.reason).toBe('violation');
    });

    it('UserLockedError', () => {
      const err = new UserLockedError('user-1');
      expect(err.code).toBe('IDENTITY_USER_LOCKED');
    });

    it('UserDeletedError', () => {
      const err = new UserDeletedError('user-1');
      expect(err.code).toBe('IDENTITY_USER_DELETED');
    });
  });

  describe('Wallet errors', () => {
    it('WalletNotFoundError', () => {
      const err = new WalletNotFoundError('wallet-1');
      expect(err.code).toBe('IDENTITY_WALLET_NOT_FOUND');
    });

    it('WalletAlreadyLinkedError', () => {
      const err = new WalletAlreadyLinkedError('0xabc');
      expect(err.code).toBe('IDENTITY_WALLET_ALREADY_LINKED');
      expect(err.context.address).toBe('0xabc');
    });

    it('WalletVerificationFailedError', () => {
      const err = new WalletVerificationFailedError('0xabc', 'bad sig');
      expect(err.code).toBe('IDENTITY_WALLET_VERIFICATION_FAILED');
      expect(err.context.reason).toBe('bad sig');
    });

    it('WalletNotVerifiedError', () => {
      const err = new WalletNotVerifiedError('wallet-1');
      expect(err.code).toBe('IDENTITY_WALLET_NOT_VERIFIED');
    });
  });

  describe('Session errors', () => {
    it('SessionNotFoundError', () => {
      const err = new SessionNotFoundError('session-1');
      expect(err.code).toBe('IDENTITY_SESSION_NOT_FOUND');
    });

    it('SessionExpiredError', () => {
      const err = new SessionExpiredError('session-1');
      expect(err.code).toBe('IDENTITY_SESSION_EXPIRED');
    });

    it('SessionRevokedError', () => {
      const err = new SessionRevokedError('session-1');
      expect(err.code).toBe('IDENTITY_SESSION_REVOKED');
    });
  });

  describe('Auth errors', () => {
    it('InvalidCredentialsError', () => {
      const err = new InvalidCredentialsError();
      expect(err.code).toBe('IDENTITY_INVALID_CREDENTIALS');
    });

    it('MfaRequiredError', () => {
      const err = new MfaRequiredError('user-1');
      expect(err.code).toBe('IDENTITY_MFA_REQUIRED');
      expect(err.context.userId).toBe('user-1');
    });

    it('MfaVerificationFailedError', () => {
      const err = new MfaVerificationFailedError('invalid code');
      expect(err.code).toBe('IDENTITY_MFA_VERIFICATION_FAILED');
    });

    it('EmailAlreadyLinkedError', () => {
      const err = new EmailAlreadyLinkedError('a@b.com');
      expect(err.code).toBe('IDENTITY_EMAIL_ALREADY_LINKED');
    });

    it('EmailVerificationFailedError', () => {
      const err = new EmailVerificationFailedError('a@b.com', 'expired');
      expect(err.code).toBe('IDENTITY_EMAIL_VERIFICATION_FAILED');
    });
  });

  describe('Passkey errors', () => {
    it('PasskeyNotFoundError', () => {
      const err = new PasskeyNotFoundError('pk-1');
      expect(err.code).toBe('IDENTITY_PASSKEY_NOT_FOUND');
    });

    it('PasskeyRegistrationFailedError', () => {
      const err = new PasskeyRegistrationFailedError('bad credential');
      expect(err.code).toBe('IDENTITY_PASSKEY_REGISTRATION_FAILED');
    });
  });

  describe('Recovery errors', () => {
    it('RecoveryNotFoundError', () => {
      const err = new RecoveryNotFoundError('rec-1');
      expect(err.code).toBe('IDENTITY_RECOVERY_NOT_FOUND');
    });

    it('RecoveryExpiredError', () => {
      const err = new RecoveryExpiredError('rec-1');
      expect(err.code).toBe('IDENTITY_RECOVERY_EXPIRED');
    });

    it('RecoveryAlreadyUsedError', () => {
      const err = new RecoveryAlreadyUsedError('rec-1');
      expect(err.code).toBe('IDENTITY_RECOVERY_ALREADY_USED');
    });
  });

  describe('Organization errors', () => {
    it('OrganizationNotFoundError', () => {
      const err = new OrganizationNotFoundError('org-1');
      expect(err.code).toBe('IDENTITY_ORGANIZATION_NOT_FOUND');
    });

    it('OrganizationAccessDeniedError', () => {
      const err = new OrganizationAccessDeniedError('org-1', 'user-1');
      expect(err.code).toBe('IDENTITY_ORGANIZATION_ACCESS_DENIED');
    });
  });

  describe('Role errors', () => {
    it('RoleNotFoundError', () => {
      const err = new RoleNotFoundError('role-1');
      expect(err.code).toBe('IDENTITY_ROLE_NOT_FOUND');
    });

    it('RoleAlreadyAssignedError', () => {
      const err = new RoleAlreadyAssignedError('role-1', 'user-1');
      expect(err.code).toBe('IDENTITY_ROLE_ALREADY_ASSIGNED');
    });

    it('RoleAssignmentNotFoundError', () => {
      const err = new RoleAssignmentNotFoundError('role-1', 'user-1');
      expect(err.code).toBe('IDENTITY_ROLE_ASSIGNMENT_NOT_FOUND');
    });
  });

  describe('ServiceAccount errors', () => {
    it('ServiceAccountNotFoundError', () => {
      const err = new ServiceAccountNotFoundError('sa-1');
      expect(err.code).toBe('IDENTITY_SERVICE_ACCOUNT_NOT_FOUND');
    });

    it('ServiceAccountAccessDeniedError', () => {
      const err = new ServiceAccountAccessDeniedError('sa-1');
      expect(err.code).toBe('IDENTITY_SERVICE_ACCOUNT_ACCESS_DENIED');
    });
  });

  describe('Authorization errors', () => {
    it('PermissionDeniedError', () => {
      const err = new PermissionDeniedError('user:write');
      expect(err.code).toBe('IDENTITY_PERMISSION_DENIED');
      expect(err.context.permission).toBe('user:write');
    });

    it('PolicyEvaluationError', () => {
      const err = new PolicyEvaluationError('policy-1', 'timeout');
      expect(err.code).toBe('IDENTITY_POLICY_EVALUATION_ERROR');
    });
  });

  describe('Token errors', () => {
    it('TokenExpiredError', () => {
      const err = new TokenExpiredError('token-1');
      expect(err.code).toBe('IDENTITY_TOKEN_EXPIRED');
    });

    it('TokenRevokedError', () => {
      const err = new TokenRevokedError('token-1');
      expect(err.code).toBe('IDENTITY_TOKEN_REVOKED');
    });

    it('TokenConsumedError', () => {
      const err = new TokenConsumedError('token-1');
      expect(err.code).toBe('IDENTITY_TOKEN_CONSUMED');
    });
  });

  describe('Serialization', () => {
    it('all errors serialize to JSON', () => {
      const err = new UserNotFoundError('user-1', { extra: 'info' });
      const json = err.toJSON();
      expect(json.name).toBe('UserNotFoundError');
      expect(json.code).toBe('IDENTITY_USER_NOT_FOUND');
      expect(typeof json.message).toBe('string');
      expect(json.context).toStrictEqual({ userId: 'user-1', extra: 'info' });
    });

    it('all errors extend Error', () => {
      const err = new PermissionDeniedError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.stack).toBeDefined();
    });
  });
});
