import type { AuthenticationMethod, UserId } from '../value-objects';

export interface MfaRequirement {
  readonly required: boolean;
  readonly allowedMethods: readonly AuthenticationMethod[];
  readonly minFactors: number;
}

export interface IMfaPolicy {
  getRequirement(userId: UserId, action?: string): Promise<MfaRequirement>;
  isMfaRequired(userId: UserId, action?: string): Promise<boolean>;
  recordMfaVerification(userId: UserId, method: AuthenticationMethod): Promise<void>;
}
