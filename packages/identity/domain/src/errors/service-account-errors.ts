import { IdentityDomainError } from './identity-domain-error';

export class ServiceAccountNotFoundError extends IdentityDomainError {
  constructor(serviceAccountId: string, context?: Record<string, unknown>) {
    super('SERVICE_ACCOUNT_NOT_FOUND', `Service account ${serviceAccountId} not found`, {
      serviceAccountId,
      ...context,
    });
  }
}

export class ServiceAccountAccessDeniedError extends IdentityDomainError {
  constructor(serviceAccountId: string, context?: Record<string, unknown>) {
    super(
      'SERVICE_ACCOUNT_ACCESS_DENIED',
      `Access denied for service account ${serviceAccountId}`,
      { serviceAccountId, ...context },
    );
  }
}
