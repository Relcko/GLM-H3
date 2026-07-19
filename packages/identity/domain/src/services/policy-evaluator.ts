import type { PolicyEffect, UserId } from '../value-objects';

export interface PolicyEvaluationRequest {
  readonly userId: UserId;
  readonly resource: string;
  readonly action: string;
  readonly context?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  readonly effect: PolicyEffect;
  readonly matchedPolicies: readonly string[];
  readonly evaluatedAt: Date;
}

export interface IPolicyEvaluator {
  evaluate(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult>;
}
