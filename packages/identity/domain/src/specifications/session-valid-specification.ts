import { Specification } from '@relcko/kernel';

export interface SessionValidCandidate {
  readonly expired: boolean;
  readonly revoked: boolean;
}

export class SessionValidSpecification extends Specification<SessionValidCandidate> {
  public isSatisfiedBy(candidate: SessionValidCandidate): boolean {
    return !candidate.expired && !candidate.revoked;
  }
}
