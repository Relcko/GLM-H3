import { Specification } from '@relcko/kernel';

export interface EmailVerificationEligibleCandidate {
  readonly userExists: boolean;
  readonly userActive: boolean;
  readonly noPendingVerification: boolean;
  readonly emailNotAlreadyVerified: boolean;
}

export class EmailVerificationEligibleSpecification extends Specification<EmailVerificationEligibleCandidate> {
  public isSatisfiedBy(candidate: EmailVerificationEligibleCandidate): boolean {
    return (
      candidate.userExists &&
      candidate.userActive &&
      candidate.noPendingVerification &&
      candidate.emailNotAlreadyVerified
    );
  }
}
