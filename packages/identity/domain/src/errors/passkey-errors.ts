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
