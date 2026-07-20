import type { Session } from '../aggregates';
import type { SessionId, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface ISessionRepository extends IRepository<Session, SessionId> {
  findByUserId(userId: UserId): Promise<readonly Session[]>;
  findActiveByUserId(userId: UserId): Promise<readonly Session[]>;
  deleteAllByUserId(userId: UserId): Promise<void>;
}
