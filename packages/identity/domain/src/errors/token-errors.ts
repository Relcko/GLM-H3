import { IdentityDomainError } from './identity-domain-error';

export class TokenExpiredError extends IdentityDomainError {
  constructor(tokenId: string, context?: Record<string, unknown>) {
    super('TOKEN_EXPIRED', `Token ${tokenId} has expired`, { tokenId, ...context });
  }
}

export class TokenRevokedError extends IdentityDomainError {
  constructor(tokenId: string, context?: Record<string, unknown>) {
    super('TOKEN_REVOKED', `Token ${tokenId} has been revoked`, { tokenId, ...context });
  }
}

export class TokenConsumedError extends IdentityDomainError {
  constructor(tokenId: string, context?: Record<string, unknown>) {
    super('TOKEN_CONSUMED', `Token ${tokenId} has already been consumed`, { tokenId, ...context });
  }
}
