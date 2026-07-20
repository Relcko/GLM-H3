import type { Organization } from '../aggregates';
import type { OrganizationId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IOrganizationRepository extends IRepository<Organization, OrganizationId> {
  findByName(name: string): Promise<Organization | null>;
}
