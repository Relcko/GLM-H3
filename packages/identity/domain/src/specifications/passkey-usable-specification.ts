import { Specification } from '@relcko/kernel';

export interface PasskeyUsableCandidate {
  readonly exists: boolean;
  readonly removed: boolean;
}

export class PasskeyUsableSpecification extends Specification<PasskeyUsableCandidate> {
  public isSatisfiedBy(candidate: PasskeyUsableCandidate): boolean {
    return candidate.exists && !candidate.removed;
  }
}
