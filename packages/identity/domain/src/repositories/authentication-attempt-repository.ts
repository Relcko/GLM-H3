import type { AttemptId, UserId } from '../value-objects';

export interface IAuthenticationAttemptRepository {
  findById(id: AttemptId): Promise<unknown>;
  getById(id: AttemptId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: AttemptId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  countRecentByUserId(userId: UserId, since: Date): Promise<number>;
}
