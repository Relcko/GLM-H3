import type { UserId } from '../value-objects';

export interface EvaluatePolicyCommand {
  readonly userId: UserId;
  readonly resource: string;
  readonly action: string;
  readonly context?: Record<string, unknown>;
}
