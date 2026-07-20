import type { UserId, WalletAddress, WalletId } from '../value-objects';

export interface GetWalletQuery {
  readonly walletId: WalletId;
}

export interface GetWalletByAddressQuery {
  readonly address: WalletAddress;
}

export interface ListWalletsQuery {
  readonly userId: UserId;
}
