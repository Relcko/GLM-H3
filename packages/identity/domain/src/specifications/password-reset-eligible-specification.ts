import { Specification } from '@relcko/kernel';

export interface PasswordResetEligibleCandidate {
  readonly userExists: boolean;
  readonly userActive: boolean;
  readonly noPendingReset: boolean;
  readonly withinRateLimit: boolean;
}

export class PasswordResetEligibleSpecification extends Specification<PasswordResetEligibleCandidate> {
  public isSatisfiedBy(candidate: PasswordResetEligibleCandidate): boolean {
    return (
      candidate.userExists &&
      candidate.userActive &&
      candidate.noPendingReset &&
      candidate.withinRateLimit
    );
  }
}
