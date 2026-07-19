import { IdentityDomainError } from './identity-domain-error';

export class RoleNotFoundError extends IdentityDomainError {
  constructor(roleId: string, context?: Record<string, unknown>) {
    super('ROLE_NOT_FOUND', `Role ${roleId} not found`, { roleId, ...context });
  }
}

export class RoleAlreadyAssignedError extends IdentityDomainError {
  constructor(roleId: string, assigneeId: string, context?: Record<string, unknown>) {
    super('ROLE_ALREADY_ASSIGNED', `Role ${roleId} is already assigned to ${assigneeId}`, {
      roleId,
      assigneeId,
      ...context,
    });
  }
}

export class RoleAssignmentNotFoundError extends IdentityDomainError {
  constructor(roleId: string, assigneeId: string, context?: Record<string, unknown>) {
    super('ROLE_ASSIGNMENT_NOT_FOUND', `Role ${roleId} is not assigned to ${assigneeId}`, {
      roleId,
      assigneeId,
      ...context,
    });
  }
}
