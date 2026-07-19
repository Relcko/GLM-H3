import type { UserId, WalletAddress, WalletId } from '../value-objects';

export interface IWalletRepository {
  findById(id: WalletId): Promise<unknown>;
  getById(id: WalletId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: WalletId): Promise<void>;
  findByAddress(address: WalletAddress): Promise<unknown>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  findPrimaryByUserId(userId: UserId): Promise<unknown>;
  existsByAddress(address: WalletAddress): Promise<boolean>;
}
