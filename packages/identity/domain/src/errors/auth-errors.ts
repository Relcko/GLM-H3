import { IdentityDomainError } from './identity-domain-error';

export class InvalidCredentialsError extends IdentityDomainError {
  constructor(context?: Record<string, unknown>) {
    super('INVALID_CREDENTIALS', 'Invalid credentials', context);
  }
}

export class MfaRequiredError extends IdentityDomainError {
  constructor(userId: string, context?: Record<string, unknown>) {
    super('MFA_REQUIRED', `MFA is required for user ${userId}`, { userId, ...context });
  }
}

export class MfaVerificationFailedError extends IdentityDomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('MFA_VERIFICATION_FAILED', `MFA verification failed: ${reason}`, { reason, ...context });
  }
}

export class EmailAlreadyLinkedError extends IdentityDomainError {
  constructor(email: string, context?: Record<string, unknown>) {
    super('EMAIL_ALREADY_LINKED', `Email ${email} is already linked to another user`, {
      email,
      ...context,
    });
  }
}

export class EmailVerificationFailedError extends IdentityDomainError {
  constructor(email: string, reason: string, context?: Record<string, unknown>) {
    super('EMAIL_VERIFICATION_FAILED', `Email ${email} verification failed: ${reason}`, {
      email,
      reason,
      ...context,
    });
  }
}
