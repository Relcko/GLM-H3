import { IdentityDomainError } from './identity-domain-error';

export class PermissionDeniedError extends IdentityDomainError {
  constructor(permission: string, context?: Record<string, unknown>) {
    super('PERMISSION_DENIED', `Permission denied: ${permission}`, { permission, ...context });
  }
}

export class PolicyEvaluationError extends IdentityDomainError {
  constructor(policyId: string, reason: string, context?: Record<string, unknown>) {
    super('POLICY_EVALUATION_ERROR', `Policy ${policyId} evaluation failed: ${reason}`, {
      policyId,
      reason,
      ...context,
    });
  }
}
