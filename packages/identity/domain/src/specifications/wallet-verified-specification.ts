import { Specification } from '@relcko/kernel';

export interface WalletVerifiedCandidate {
  readonly verified: boolean;
}

export class WalletVerifiedSpecification extends Specification<WalletVerifiedCandidate> {
  public isSatisfiedBy(candidate: WalletVerifiedCandidate): boolean {
    return candidate.verified;
  }
}
