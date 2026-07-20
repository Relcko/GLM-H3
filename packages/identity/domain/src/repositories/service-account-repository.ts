import type { ServiceAccount } from '../aggregates';
import type { ServiceAccountId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IServiceAccountRepository extends IRepository<ServiceAccount, ServiceAccountId> {
  findByName(name: string): Promise<ServiceAccount | null>;
}
