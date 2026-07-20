import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { ServiceAccount } from './index';

export interface ServiceAccountRepository extends IRepository<ServiceAccount, EntityId> {
  findByOrganization(organizationId: string): Promise<ServiceAccount[]>;
  findByKeyHash(keyHash: string): Promise<ServiceAccount | null>;
}
