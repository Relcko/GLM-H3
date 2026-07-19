import { IdentityDomainError } from './identity-domain-error';

export class SessionNotFoundError extends IdentityDomainError {
  constructor(sessionId: string, context?: Record<string, unknown>) {
    super('SESSION_NOT_FOUND', `Session ${sessionId} not found`, { sessionId, ...context });
  }
}

export class SessionExpiredError extends IdentityDomainError {
  constructor(sessionId: string, context?: Record<string, unknown>) {
    super('SESSION_EXPIRED', `Session ${sessionId} has expired`, { sessionId, ...context });
  }
}

export class SessionRevokedError extends IdentityDomainError {
  constructor(sessionId: string, context?: Record<string, unknown>) {
    super('SESSION_REVOKED', `Session ${sessionId} has been revoked`, { sessionId, ...context });
  }
}
