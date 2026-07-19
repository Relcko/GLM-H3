import type { UserId } from '../value-objects';

export interface EvaluatePolicyQuery {
  readonly userId: UserId;
  readonly resource: string;
  readonly action: string;
  readonly context?: Record<string, unknown>;
}

export interface GetUserPermissionsQuery {
  readonly userId: UserId;
}
