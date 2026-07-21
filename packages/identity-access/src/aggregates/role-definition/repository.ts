import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { RoleDefinition } from './index';

export interface RoleDefinitionRepository extends IRepository<RoleDefinition, EntityId> {
  findByName(name: string): Promise<RoleDefinition | null>;
  findAllPlatform(): Promise<RoleDefinition[]>;
  findAll(): Promise<RoleDefinition[]>;
}
