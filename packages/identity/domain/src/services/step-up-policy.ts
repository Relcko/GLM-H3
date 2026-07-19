import type { AuthenticationMethod, UserId } from '../value-objects';

export interface StepUpRequirement {
  readonly stepUpRequired: boolean;
  readonly minimumMethod: AuthenticationMethod;
  readonly reason?: string;
}

export interface IStepUpPolicy {
  evaluate(
    userId: UserId,
    currentMethod: AuthenticationMethod,
    targetAction: string,
  ): Promise<StepUpRequirement>;
  recordStepUp(userId: UserId, method: AuthenticationMethod): Promise<void>;
}
