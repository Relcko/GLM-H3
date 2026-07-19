import type { RoleId, UserId } from '../value-objects';

export interface IRoleDefinitionRepository {
  findById(id: RoleId): Promise<unknown>;
  getById(id: RoleId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: RoleId): Promise<void>;
  findByName(name: string): Promise<unknown>;
  findByAssigneeId(assigneeId: UserId): Promise<readonly unknown[]>;
  existsByName(name: string): Promise<boolean>;
}
