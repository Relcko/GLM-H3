import type { Wallet } from '../aggregates';
import type { UserId, WalletAddress, WalletId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IWalletRepository extends IRepository<Wallet, WalletId> {
  findByAddress(address: WalletAddress): Promise<Wallet | null>;
  findByUserId(userId: UserId): Promise<readonly Wallet[]>;
  findPrimaryByUserId(userId: UserId): Promise<Wallet | null>;
  existsByAddress(address: WalletAddress): Promise<boolean>;
}
