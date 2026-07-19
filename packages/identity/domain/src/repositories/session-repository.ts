import type { SessionId, UserId } from '../value-objects';

export interface ISessionRepository {
  findById(id: SessionId): Promise<unknown>;
  getById(id: SessionId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: SessionId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  findActiveByUserId(userId: UserId): Promise<readonly unknown[]>;
  deleteAllByUserId(userId: UserId): Promise<void>;
}
