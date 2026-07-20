import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { Organization } from './index';

export interface OrganizationRepository extends IRepository<Organization, EntityId> {
  findByMember(userId: string): Promise<Organization[]>;
  findParentOrganization(childId: string): Promise<Organization | null>;
}
