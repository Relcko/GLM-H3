import type { RoleDefinition } from '../aggregates';
import type { RoleId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IRoleDefinitionRepository extends IRepository<RoleDefinition, RoleId> {
  findByName(name: string): Promise<RoleDefinition | null>;
  findActive(): Promise<readonly RoleDefinition[]>;
}
