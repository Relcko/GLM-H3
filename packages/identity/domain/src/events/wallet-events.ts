import { EventCatalog } from './event-catalog';

import type { UserId, WalletAddress, WalletId } from '../value-objects';

export interface WalletLinkedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly address: WalletAddress;
  readonly chainId: number;
  readonly linkedAt: Date;
}

export interface WalletVerifiedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly verifiedAt: Date;
}

export interface WalletUnlinkedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly unlinkedAt: Date;
}

export interface WalletPrimarySetPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly setAt: Date;
}

export const WalletEventTypeMap = {
  linked: EventCatalog.WALLET_LINKED,
  verified: EventCatalog.WALLET_VERIFIED,
  unlinked: EventCatalog.WALLET_UNLINKED,
  primarySet: EventCatalog.WALLET_PRIMARY_SET,
} as const;
