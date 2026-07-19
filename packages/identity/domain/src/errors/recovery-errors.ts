import { IdentityDomainError } from './identity-domain-error';

export class RecoveryNotFoundError extends IdentityDomainError {
  constructor(recoveryId: string, context?: Record<string, unknown>) {
    super('RECOVERY_NOT_FOUND', `Recovery ${recoveryId} not found`, { recoveryId, ...context });
  }
}

export class RecoveryExpiredError extends IdentityDomainError {
  constructor(recoveryId: string, context?: Record<string, unknown>) {
    super('RECOVERY_EXPIRED', `Recovery ${recoveryId} has expired`, { recoveryId, ...context });
  }
}

export class RecoveryAlreadyUsedError extends IdentityDomainError {
  constructor(recoveryId: string, context?: Record<string, unknown>) {
    super('RECOVERY_ALREADY_USED', `Recovery ${recoveryId} has already been used`, {
      recoveryId,
      ...context,
    });
  }
}
