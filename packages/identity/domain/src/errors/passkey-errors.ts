import { IdentityDomainError } from './identity-domain-error';

export class PasskeyNotFoundError extends IdentityDomainError {
  constructor(passkeyId: string, context?: Record<string, unknown>) {
    super('PASSKEY_NOT_FOUND', `Passkey ${passkeyId} not found`, { passkeyId, ...context });
  }
}

export class PasskeyRegistrationFailedError extends IdentityDomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('PASSKEY_REGISTRATION_FAILED', `Passkey registration failed: ${reason}`, {
      reason,
      ...context,
    });
  }
}

export class PasskeyRevokedError extends IdentityDomainError {
  constructor(passkeyId: string, reason?: string, context?: Record<string, unknown>) {
    super('PASSKEY_REVOKED', `Passkey ${passkeyId} is revoked${reason ? `: ${reason}` : ''}`, {
      passkeyId,
      reason,
      ...context,
    });
  }
}

export class PasskeyNotVerifiedError extends IdentityDomainError {
  constructor(passkeyId: string, context?: Record<string, unknown>) {
    super('PASSKEY_NOT_VERIFIED', `Passkey ${passkeyId} is not verified`, {
      passkeyId,
      ...context,
    });
  }
}
