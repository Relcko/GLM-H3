import { Specification } from '@relcko/kernel';

import type { Permission } from '../value-objects';

export interface PermissionCandidate {
  readonly permissions: readonly Permission[];
}

export class PermissionSpecification extends Specification<PermissionCandidate> {
  constructor(private readonly requiredPermission: Permission) {
    super();
  }

  public isSatisfiedBy(candidate: PermissionCandidate): boolean {
    return candidate.permissions.some((p) => p.equals(this.requiredPermission));
  }
}
