import { Specification } from '@relcko/kernel';

export interface RoleAssignableCandidate {
  readonly roleExists: boolean;
  readonly alreadyAssigned: boolean;
  readonly assigneeActive: boolean;
}

export class RoleAssignableSpecification extends Specification<RoleAssignableCandidate> {
  public isSatisfiedBy(candidate: RoleAssignableCandidate): boolean {
    return candidate.roleExists && !candidate.alreadyAssigned && candidate.assigneeActive;
  }
}
