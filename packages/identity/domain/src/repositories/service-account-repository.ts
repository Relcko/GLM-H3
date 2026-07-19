import type { ServiceAccountId, UserId } from '../value-objects';

export interface IServiceAccountRepository {
  findById(id: ServiceAccountId): Promise<unknown>;
  getById(id: ServiceAccountId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: ServiceAccountId): Promise<void>;
  findByName(name: string): Promise<unknown>;
  findByCreatedBy(createdBy: UserId): Promise<readonly unknown[]>;
}
