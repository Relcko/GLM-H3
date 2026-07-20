import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import { WalletNotVerifiedError } from '../../errors';
import {
  WalletChainAdded,
  WalletLinked,
  WalletMetadataUpdated,
  WalletPrimarySet,
  WalletPrimaryUnset,
  WalletUnlinked,
  WalletVerificationRevoked,
  WalletVerified,
} from '../../events/wallet-events';
import { ChainId, UserId, WalletAddress, WalletId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface WalletSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly address: string;
  readonly chainId: number;
  readonly label: string | null;
  readonly verified: boolean;
  readonly primary: boolean;
  readonly unlinked: boolean;
  readonly supportedChains: readonly number[];
  readonly linkedAt: string;
  readonly verifiedAt: string | null;
  readonly unlinkedAt: string | null;
  readonly primarySetAt: string | null;
  readonly version: number;
}

export class Wallet extends AggregateRoot<WalletId> {
  readonly aggregateType = 'Wallet';

  private _userId!: UserId;
  private _address!: WalletAddress;
  private _chainId!: ChainId;
  private _label: string | null = null;
  private _verified = false;
  private _primary = false;
  private _unlinked = false;
  private _supportedChains: ChainId[] = [];
  private _linkedAt!: Date;
  private _verifiedAt: Date | null = null;
  private _unlinkedAt: Date | null = null;
  private _primarySetAt: Date | null = null;

  private constructor(id: WalletId) {
    super(id);
  }

  static link(
    id: WalletId,
    userId: UserId,
    address: WalletAddress,
    chainId: ChainId,
    label: string | null,
    eventId: EventId,
    occurredAt: Date,
  ): Wallet {
    const wallet = new Wallet(id);
    wallet.apply(
      new WalletLinked(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: wallet.aggregateType,
          aggregateVersion: wallet.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        address,
        chainId,
        label,
        occurredAt,
      ),
    );
    return wallet;
  }

  static fromSnapshot(snapshot: WalletSnapshot): Wallet {
    const wallet = new Wallet(new WalletId(snapshot.id));
    wallet._userId = new UserId(snapshot.userId);
    wallet._address = new WalletAddress(snapshot.address);
    wallet._chainId = new ChainId(snapshot.chainId);
    wallet._label = snapshot.label;
    wallet._verified = snapshot.verified;
    wallet._primary = snapshot.primary;
    wallet._unlinked = snapshot.unlinked;
    wallet._supportedChains = snapshot.supportedChains.map((c) => new ChainId(c));
    wallet._linkedAt = new Date(snapshot.linkedAt);
    wallet._verifiedAt = snapshot.verifiedAt ? new Date(snapshot.verifiedAt) : null;
    wallet._unlinkedAt = snapshot.unlinkedAt ? new Date(snapshot.unlinkedAt) : null;
    wallet._primarySetAt = snapshot.primarySetAt ? new Date(snapshot.primarySetAt) : null;
    wallet.restoreVersion(snapshot.version);
    return wallet;
  }

  static reconstitute(id: WalletId): Wallet {
    return new Wallet(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get address(): WalletAddress {
    return this._address;
  }

  get chainId(): ChainId {
    return this._chainId;
  }

  get label(): string | null {
    return this._label;
  }

  get verified(): boolean {
    return this._verified;
  }

  get primary(): boolean {
    return this._primary;
  }

  get unlinked(): boolean {
    return this._unlinked;
  }

  get supportedChains(): readonly ChainId[] {
    return [...this._supportedChains];
  }

  get linkedAt(): Date {
    return this._linkedAt;
  }

  get verifiedAt(): Date | null {
    return this._verifiedAt;
  }

  get unlinkedAt(): Date | null {
    return this._unlinkedAt;
  }

  get primarySetAt(): Date | null {
    return this._primarySetAt;
  }

  verifyOwnership(eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    if (this._verified) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-already-verified',
        {},
      );
    }
    this.apply(
      new WalletVerified(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  revokeVerification(reason: string, eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    if (!this._verified) {
      throw new WalletNotVerifiedError(this.id.toString());
    }
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-revoke-reason-required',
        {},
      );
    }
    if (this._primary) {
      this.unsetPrimary(eventId, occurredAt);
    }
    this.apply(
      new WalletVerificationRevoked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        reason,
        occurredAt,
      ),
    );
  }

  disconnect(eventId: EventId, occurredAt: Date): void {
    if (this._unlinked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-already-unlinked',
        {},
      );
    }
    if (this._primary) {
      this.unsetPrimary(eventId, occurredAt);
    }
    this.apply(
      new WalletUnlinked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  setPrimary(eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    this.requireVerified();
    if (this._primary) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-already-primary',
        {},
      );
    }
    this.apply(
      new WalletPrimarySet(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  unsetPrimary(eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    if (!this._primary) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-not-primary',
        {},
      );
    }
    this.apply(
      new WalletPrimaryUnset(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  addSupportedChain(chainId: ChainId, eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    this.requireVerified();
    if (this._supportedChains.some((c) => c.equals(chainId))) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-chain-already-added',
        { chainId: chainId.value },
      );
    }
    this.apply(
      new WalletChainAdded(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        chainId,
        occurredAt,
      ),
    );
  }

  updateMetadata(label: string | null, eventId: EventId, occurredAt: Date): void {
    this.requireLinked();
    if (label !== null && !label.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-label-empty',
        {},
      );
    }
    const normalizedLabel = label !== null ? label.trim() : null;
    if (normalizedLabel === this._label) {
      return;
    }
    this.apply(
      new WalletMetadataUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        normalizedLabel,
        occurredAt,
      ),
    );
  }

  toSnapshot(): WalletSnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      address: this._address.toString(),
      chainId: this._chainId.value,
      label: this._label,
      verified: this._verified,
      primary: this._primary,
      unlinked: this._unlinked,
      supportedChains: this._supportedChains.map((c) => c.value),
      linkedAt: this._linkedAt.toISOString(),
      verifiedAt: this._verifiedAt?.toISOString() ?? null,
      unlinkedAt: this._unlinkedAt?.toISOString() ?? null,
      primarySetAt: this._primarySetAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof WalletLinked) {
      this._userId = event.userId;
      this._address = event.address;
      this._chainId = event.chainId;
      this._label = event.label;
      this._linkedAt = event.linkedAt;
    } else if (event instanceof WalletVerified) {
      this._verified = true;
      this._verifiedAt = event.verifiedAt;
    } else if (event instanceof WalletVerificationRevoked) {
      this._verified = false;
      this._verifiedAt = null;
    } else if (event instanceof WalletUnlinked) {
      this._unlinked = true;
      this._unlinkedAt = event.unlinkedAt;
    } else if (event instanceof WalletPrimarySet) {
      this._primary = true;
      this._primarySetAt = event.setAt;
    } else if (event instanceof WalletPrimaryUnset) {
      this._primary = false;
      this._primarySetAt = null;
    } else if (event instanceof WalletChainAdded) {
      this._supportedChains.push(event.chainId);
    } else if (event instanceof WalletMetadataUpdated) {
      this._label = event.label;
    }
  }

  private requireLinked(): void {
    if (this._unlinked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'wallet-unlinked',
        {},
      );
    }
  }

  private requireVerified(): void {
    if (!this._verified) {
      throw new WalletNotVerifiedError(this.id.toString());
    }
  }
}
