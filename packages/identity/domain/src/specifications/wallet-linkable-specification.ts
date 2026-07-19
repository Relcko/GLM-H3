import { Specification } from '@relcko/kernel';

export interface WalletLinkableCandidate {
  readonly alreadyLinked: boolean;
  readonly userActive: boolean;
  readonly addressValid: boolean;
  readonly maxWalletsReached: boolean;
}

export class WalletLinkableSpecification extends Specification<WalletLinkableCandidate> {
  public isSatisfiedBy(candidate: WalletLinkableCandidate): boolean {
    return (
      !candidate.alreadyLinked &&
      candidate.userActive &&
      candidate.addressValid &&
      !candidate.maxWalletsReached
    );
  }
}
