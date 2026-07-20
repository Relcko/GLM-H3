import { IdentityDomainError } from './identity-domain-error';

export class UserNotFoundError extends IdentityDomainError {
  constructor(userId: string, context?: Record<string, unknown>) {
    super('USER_NOT_FOUND', `User with id ${userId} not found`, { userId, ...context });
  }
}

export class UserAlreadyExistsError extends IdentityDomainError {
  constructor(email: string, context?: Record<string, unknown>) {
    super('USER_ALREADY_EXISTS', `User with email ${email} already exists`, { email, ...context });
  }
}

export class UserSuspendedError extends IdentityDomainError {
  constructor(userId: string, reason?: string, context?: Record<string, unknown>) {
    super('USER_SUSPENDED', `User ${userId} is suspended${reason ? `: ${reason}` : ''}`, {
      userId,
      reason,
      ...context,
    });
  }
}

export class UserLockedError extends IdentityDomainError {
  constructor(userId: string, context?: Record<string, unknown>) {
    super('USER_LOCKED', `User ${userId} is locked due to too many failed attempts`, {
      userId,
      ...context,
    });
  }
}

export class UserDeletedError extends IdentityDomainError {
  constructor(userId: string, context?: Record<string, unknown>) {
    super('USER_DELETED', `User ${userId} has been deleted`, { userId, ...context });
  }
}
