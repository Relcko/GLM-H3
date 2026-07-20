import { IdentityDomainError } from './identity-domain-error';

export class OrganizationNotFoundError extends IdentityDomainError {
  constructor(organizationId: string, context?: Record<string, unknown>) {
    super('ORGANIZATION_NOT_FOUND', `Organization ${organizationId} not found`, {
      organizationId,
      ...context,
    });
  }
}

export class OrganizationAccessDeniedError extends IdentityDomainError {
  constructor(organizationId: string, userId: string, context?: Record<string, unknown>) {
    super(
      'ORGANIZATION_ACCESS_DENIED',
      `User ${userId} does not have access to organization ${organizationId}`,
      { organizationId, userId, ...context },
    );
  }
}
