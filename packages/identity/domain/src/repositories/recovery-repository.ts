import type { RecoveryId, UserId } from '../value-objects';

export interface IRecoveryRepository {
  findById(id: RecoveryId): Promise<unknown>;
  getById(id: RecoveryId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: RecoveryId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  findPendingByUserId(userId: UserId): Promise<unknown>;
}
