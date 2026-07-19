import { Specification } from '@relcko/kernel';

export interface RecoveryEligibleCandidate {
  readonly hasActiveRecovery: boolean;
  readonly hasGuardians: boolean;
  readonly userActive: boolean;
  readonly recoveryWindowOpen: boolean;
}

export class RecoveryEligibleSpecification extends Specification<RecoveryEligibleCandidate> {
  public isSatisfiedBy(candidate: RecoveryEligibleCandidate): boolean {
    return (
      !candidate.hasActiveRecovery &&
      candidate.hasGuardians &&
      candidate.userActive &&
      candidate.recoveryWindowOpen
    );
  }
}
