import type { UserId, WalletAddress } from '../value-objects';

export interface IWalletOwnershipResolver {
  isOwner(userId: UserId, address: WalletAddress): Promise<boolean>;
  getOwner(address: WalletAddress): Promise<UserId | null>;
  getWallets(userId: UserId): Promise<readonly WalletAddress[]>;
}
