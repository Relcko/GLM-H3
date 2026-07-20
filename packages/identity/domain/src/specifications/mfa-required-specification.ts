import { Specification } from '@relcko/kernel';

export interface MfaRequiredCandidate {
  readonly mfaEnabled: boolean;
  readonly sensitiveAction: boolean;
  readonly recentMfaVerification: boolean;
}

export class MfaRequiredSpecification extends Specification<MfaRequiredCandidate> {
  public isSatisfiedBy(candidate: MfaRequiredCandidate): boolean {
    return candidate.mfaEnabled && candidate.sensitiveAction && !candidate.recentMfaVerification;
  }
}
