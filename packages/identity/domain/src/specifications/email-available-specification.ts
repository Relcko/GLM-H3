import { Specification } from '@relcko/kernel';

import type { EmailAddress } from '../value-objects';

export interface EmailAvailableCandidate {
  readonly email: EmailAddress;
}

export interface IEmailAvailabilityChecker {
  isEmailAvailable(email: EmailAddress): Promise<boolean>;
}

export class EmailAvailableSpecification extends Specification<EmailAvailableCandidate> {
  constructor(private readonly checker: IEmailAvailabilityChecker) {
    super();
  }

  public isSatisfiedBy(candidate: EmailAvailableCandidate): boolean {
    return this.checker.isEmailAvailable(candidate.email) as unknown as boolean;
  }
}
