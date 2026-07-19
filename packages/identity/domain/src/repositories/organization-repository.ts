import type { OrganizationId, UserId } from '../value-objects';

export interface IOrganizationRepository {
  findById(id: OrganizationId): Promise<unknown>;
  getById(id: OrganizationId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: OrganizationId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  existsByName(name: string): Promise<boolean>;
}
