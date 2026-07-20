import { Specification } from '@relcko/kernel';

import type { UserStatus } from '../value-objects';

export interface UserActiveCandidate {
  readonly status: UserStatus;
}

export class UserActiveSpecification extends Specification<UserActiveCandidate> {
  public isSatisfiedBy(candidate: UserActiveCandidate): boolean {
    return candidate.status.isActive;
  }
}
