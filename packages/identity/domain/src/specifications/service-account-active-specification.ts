import { Specification } from '@relcko/kernel';

export interface ServiceAccountActiveCandidate {
  readonly active: boolean;
  readonly deactivated: boolean;
}

export class ServiceAccountActiveSpecification extends Specification<ServiceAccountActiveCandidate> {
  public isSatisfiedBy(candidate: ServiceAccountActiveCandidate): boolean {
    return candidate.active && !candidate.deactivated;
  }
}
