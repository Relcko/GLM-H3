import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { ChainId, Signature, UserId, WalletAddress, WalletId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface WalletLinkedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly address: WalletAddress;
  readonly chainId: ChainId;
  readonly label: string | null;
  readonly linkedAt: Date;
}

export interface WalletVerifiedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly verifiedAt: Date;
}

export interface WalletVerificationRevokedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly reason: string;
  readonly revokedAt: Date;
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

export interface WalletPrimaryUnsetPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly unsetAt: Date;
}

export interface WalletChainAddedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly chainId: ChainId;
  readonly addedAt: Date;
}

export interface WalletMetadataUpdatedPayload {
  readonly walletId: WalletId;
  readonly userId: UserId;
  readonly label: string | null;
  readonly updatedAt: Date;
}

export class WalletLinked extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_LINKED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly address: WalletAddress,
    readonly chainId: ChainId,
    readonly label: string | null,
    readonly linkedAt: Date,
  ) {
    super(props);
  }
}

export class WalletVerified extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_VERIFIED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly verifiedAt: Date,
  ) {
    super(props);
  }
}

export class WalletVerificationRevoked extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_VERIFICATION_REVOKED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly reason: string,
    readonly revokedAt: Date,
  ) {
    super(props);
  }
}

export class WalletUnlinked extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_UNLINKED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly unlinkedAt: Date,
  ) {
    super(props);
  }
}

export class WalletPrimarySet extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_PRIMARY_SET;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly setAt: Date,
  ) {
    super(props);
  }
}

export class WalletPrimaryUnset extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_PRIMARY_UNSET;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly unsetAt: Date,
  ) {
    super(props);
  }
}

export class WalletChainAdded extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_CHAIN_ADDED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly chainId: ChainId,
    readonly addedAt: Date,
  ) {
    super(props);
  }
}

export class WalletMetadataUpdated extends DomainEvent {
  readonly eventType = EventCatalog.WALLET_METADATA_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly walletId: WalletId,
    readonly userId: UserId,
    readonly label: string | null,
    readonly updatedAt: Date,
  ) {
    super(props);
  }
}

export const WalletEventTypeMap = {
  linked: EventCatalog.WALLET_LINKED,
  verified: EventCatalog.WALLET_VERIFIED,
  verificationRevoked: EventCatalog.WALLET_VERIFICATION_REVOKED,
  unlinked: EventCatalog.WALLET_UNLINKED,
  primarySet: EventCatalog.WALLET_PRIMARY_SET,
  primaryUnset: EventCatalog.WALLET_PRIMARY_UNSET,
  chainAdded: EventCatalog.WALLET_CHAIN_ADDED,
  metadataUpdated: EventCatalog.WALLET_METADATA_UPDATED,
} as const;

export type WalletSignature = Signature;
