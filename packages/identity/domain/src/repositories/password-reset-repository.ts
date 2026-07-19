import type { TokenId, UserId } from '../value-objects';

export interface IPasswordResetRepository {
  findById(id: TokenId): Promise<unknown>;
  getById(id: TokenId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: TokenId): Promise<void>;
  findByUserId(userId: UserId): Promise<unknown>;
}
