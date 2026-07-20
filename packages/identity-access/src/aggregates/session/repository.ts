import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { Session } from './index';

export interface SessionRepository extends IRepository<Session, EntityId> {
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  findActiveByUser(userId: string): Promise<Session[]>;
  revokeAllForUser(userId: string): Promise<number>;
  countActiveByUser(userId: string): Promise<number>;
}
