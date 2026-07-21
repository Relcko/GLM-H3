import { DomainError, ForbiddenError, ValidationError } from '@relcko/errors';

export class IdentityAccessError extends DomainError {
  constructor(message: string, code = 'IDENTITY_ACCESS_VIOLATION') {
    super(code, message);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super('USER_NOT_FOUND', `User not found: ${userId}`, { userId });
  }
}

export class UserSuspendedError extends DomainError {
  constructor(userId: string) {
    super('USER_SUSPENDED', `User is suspended: ${userId}`, { userId });
  }
}

export class AuthenticationFailedError extends DomainError {
  constructor(message: string, code = 'AUTHENTICATION_FAILED') {
    super(code, message);
  }
}

export class AccountLockedError extends DomainError {
  constructor(userId: string, remainingSeconds: number) {
    super('ACCOUNT_LOCKED', `Account locked until ${new Date(Date.now() + remainingSeconds * 1000).toISOString()}`, {
      userId,
      remainingSeconds,
    });
  }
}

export class MfaRequiredError extends DomainError {
  constructor(userId: string) {
    super('MFA_REQUIRED', 'MFA verification required', { userId });
  }
}

export class MfaVerificationFailedError extends DomainError {
  constructor(message = 'MFA verification failed') {
    super('MFA_VERIFICATION_FAILED', message);
  }
}

export class InvalidTokenError extends DomainError {
  constructor(message = 'Invalid or expired token') {
    super('INVALID_TOKEN', message);
  }
}

export class SessionExpiredError extends DomainError {
  constructor(sessionId: string) {
    super('SESSION_EXPIRED', `Session expired: ${sessionId}`, { sessionId });
  }
}

export class SessionRevokedError extends DomainError {
  constructor(sessionId: string) {
    super('SESSION_REVOKED', `Session revoked: ${sessionId}`, { sessionId });
  }
}

export class RefreshTokenReuseError extends DomainError {
  constructor(sessionId: string) {
    super('REFRESH_TOKEN_REUSE', `Refresh token reuse detected for session ${sessionId}`, { sessionId });
  }
}

export class PermissionDeniedError extends ForbiddenError {
  constructor(action: string, reason: string) {
    super(`Permission denied for ${action}: ${reason}`, { action, reason });
  }
}

export class OrganizationNotFoundError extends DomainError {
  constructor(orgId: string) {
    super('ORGANIZATION_NOT_FOUND', `Organization not found: ${orgId}`, { orgId });
  }
}

export class InvitationExpiredError extends DomainError {
  constructor(invitationId: string) {
    super('INVITATION_EXPIRED', `Invitation expired: ${invitationId}`, { invitationId });
  }
}

export class RoleAssignmentError extends DomainError {
  constructor(message: string) {
    super('ROLE_ASSIGNMENT_ERROR', message);
  }
}

export class ServiceAccountError extends DomainError {
  constructor(message: string) {
    super('SERVICE_ACCOUNT_ERROR', message);
  }
}

export class PasswordPolicyViolationError extends ValidationError {
  constructor(message: string) {
    super(message);
  }
}

export class EmailAlreadyVerifiedError extends DomainError {
  constructor(email: string) {
    super('EMAIL_ALREADY_VERIFIED', `Email already verified: ${email}`, { email });
  }
}

export class VerificationTokenExpiredError extends DomainError {
  constructor(tokenId: string) {
    super('VERIFICATION_TOKEN_EXPIRED', `Verification token expired: ${tokenId}`, { tokenId });
  }
}

export class PasswordResetTokenExpiredError extends DomainError {
  constructor(tokenId: string) {
    super('PASSWORD_RESET_TOKEN_EXPIRED', `Password reset token expired: ${tokenId}`, { tokenId });
  }
}
