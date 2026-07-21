import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { User } from './index';

export interface UserRepository extends IRepository<User, EntityId> {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findActiveByEmail(email: string): Promise<User | null>;
}
