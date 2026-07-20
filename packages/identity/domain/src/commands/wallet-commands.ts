import type { ChainId, Nonce, Signature, UserId, WalletAddress } from '../value-objects';

export interface LinkWalletCommand {
  readonly userId: UserId;
  readonly address: WalletAddress;
  readonly chainId: ChainId;
  readonly signature: Signature;
  readonly nonce: Nonce;
}

export interface VerifyWalletCommand {
  readonly userId: UserId;
  readonly address: WalletAddress;
}

export interface UnlinkWalletCommand {
  readonly userId: UserId;
  readonly address: WalletAddress;
}

export interface SetPrimaryWalletCommand {
  readonly userId: UserId;
  readonly address: WalletAddress;
}
