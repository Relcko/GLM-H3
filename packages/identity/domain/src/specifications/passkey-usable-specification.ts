import { Specification } from '@relcko/kernel';

export interface PasskeyUsableCandidate {
  readonly verified: boolean;
  readonly active: boolean;
  readonly revoked: boolean;
}

export class PasskeyUsableSpecification extends Specification<PasskeyUsableCandidate> {
  public isSatisfiedBy(candidate: PasskeyUsableCandidate): boolean {
    return candidate.verified && candidate.active && !candidate.revoked;
  }
}
