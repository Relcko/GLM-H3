import { Specification } from '@relcko/kernel';

export interface TokenValidCandidate {
  readonly expired: boolean;
  readonly revoked: boolean;
  readonly consumed: boolean;
}

export class TokenValidSpecification extends Specification<TokenValidCandidate> {
  public isSatisfiedBy(candidate: TokenValidCandidate): boolean {
    return !candidate.expired && !candidate.revoked && !candidate.consumed;
  }
}
