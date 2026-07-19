import { Specification } from '@relcko/kernel';

export interface OrganizationActiveCandidate {
  readonly active: boolean;
  readonly deleted: boolean;
}

export class OrganizationActiveSpecification extends Specification<OrganizationActiveCandidate> {
  public isSatisfiedBy(candidate: OrganizationActiveCandidate): boolean {
    return candidate.active && !candidate.deleted;
  }
}
