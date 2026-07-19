import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { Wallet } from '../../aggregates/wallet';
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

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';
const T5 = '2026-01-06T00:00:00.000Z';

const validWalletId = (): WalletId => new WalletId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validAddress = (): WalletAddress => new WalletAddress('0x' + 'a'.repeat(40));
const validChainId = (): ChainId => new ChainId(1);
const altAddress = (): WalletAddress => new WalletAddress('0x' + 'b'.repeat(40));

function createWallet(overrides?: {
  id?: WalletId;
  userId?: UserId;
  address?: WalletAddress;
  chainId?: ChainId;
  label?: string | null;
}): Wallet {
  return Wallet.link(
    overrides?.id ?? validWalletId(),
    overrides?.userId ?? validUserId(),
    overrides?.address ?? validAddress(),
    overrides?.chainId ?? validChainId(),
    overrides?.label ?? null,
    nextEventId(),
    at(T0),
  );
}

function createVerifiedWallet(): Wallet {
  const wallet = createWallet();
  wallet.verifyOwnership(nextEventId(), at(T1));
  return wallet;
}

function createPrimaryWallet(): Wallet {
  const wallet = createVerifiedWallet();
  wallet.setPrimary(nextEventId(), at(T2));
  return wallet;
}

describe('Wallet Aggregate — Factory: link()', () => {
  it('creates a wallet with correct state', () => {
    const id = validWalletId();
    const userId = validUserId();
    const address = validAddress();
    const chainId = validChainId();
    const wallet = Wallet.link(id, userId, address, chainId, 'Main', nextEventId(), at(T0));

    expect(wallet.id).toBe(id);
    expect(wallet.userId).toBe(userId);
    expect(wallet.address).toBe(address);
    expect(wallet.chainId).toBe(chainId);
    expect(wallet.label).toBe('Main');
  });

  it('initializes with unverified, non-primary, linked state', () => {
    const wallet = createWallet();
    expect(wallet.verified).toBe(false);
    expect(wallet.primary).toBe(false);
    expect(wallet.unlinked).toBe(false);
  });

  it('initializes with empty supportedChains', () => {
    const wallet = createWallet();
    expect(wallet.supportedChains).toHaveLength(0);
  });

  it('initializes timestamps correctly', () => {
    const wallet = createWallet();
    expect(wallet.linkedAt).toEqual(at(T0));
    expect(wallet.verifiedAt).toBeNull();
    expect(wallet.unlinkedAt).toBeNull();
    expect(wallet.primarySetAt).toBeNull();
  });

  it('emits WalletLinked event with correct payload', () => {
    const id = validWalletId();
    const userId = validUserId();
    const address = validAddress();
    const chainId = validChainId();
    const eventId = nextEventId();
    const wallet = Wallet.link(id, userId, address, chainId, 'Main', eventId, at(T0));

    const events = wallet.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as WalletLinked;
    expect(event).toBeInstanceOf(WalletLinked);
    expect(event.eventType).toBe('identity.wallet.linked');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateId).toBe(id.toString());
    expect(event.aggregateType).toBe('Wallet');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.walletId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.address).toBe(address);
    expect(event.chainId).toBe(chainId);
    expect(event.label).toBe('Main');
    expect(event.linkedAt).toEqual(at(T0));
  });

  it('starts at version 1 after linking', () => {
    const wallet = createWallet();
    expect(wallet.version).toBe(1);
  });

  it('accepts null label', () => {
    const wallet = createWallet({ label: null });
    expect(wallet.label).toBeNull();
  });
});

describe('Wallet Aggregate — verifyOwnership()', () => {
  it('marks wallet as verified', () => {
    const wallet = createWallet();
    wallet.verifyOwnership(nextEventId(), at(T1));
    expect(wallet.verified).toBe(true);
  });

  it('emits WalletVerified event', () => {
    const wallet = createWallet();
    const eventId = nextEventId();
    wallet.verifyOwnership(eventId, at(T1));

    const events = wallet.getUncommittedEvents();
    const event = events[1] as WalletVerified;
    expect(event).toBeInstanceOf(WalletVerified);
    expect(event.eventType).toBe('identity.wallet.verified');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(2);
    expect(event.verifiedAt).toEqual(at(T1));
  });

  it('sets verifiedAt timestamp', () => {
    const wallet = createWallet();
    wallet.verifyOwnership(nextEventId(), at(T1));
    expect(wallet.verifiedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const wallet = createWallet();
    wallet.verifyOwnership(nextEventId(), at(T1));
    expect(wallet.version).toBe(2);
  });

  it('throws when already verified', () => {
    const wallet = createVerifiedWallet();
    expect(() => {
      wallet.verifyOwnership(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unlinked', () => {
    const wallet = createWallet();
    wallet.disconnect(nextEventId(), at(T1));
    expect(() => {
      wallet.verifyOwnership(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — revokeVerification()', () => {
  it('marks wallet as unverified', () => {
    const wallet = createVerifiedWallet();
    wallet.revokeVerification('security concern', nextEventId(), at(T2));
    expect(wallet.verified).toBe(false);
  });

  it('emits WalletVerificationRevoked event with reason', () => {
    const wallet = createVerifiedWallet();
    const eventId = nextEventId();
    wallet.revokeVerification('security concern', eventId, at(T2));

    const events = wallet.getUncommittedEvents();
    const event = events[2] as WalletVerificationRevoked;
    expect(event).toBeInstanceOf(WalletVerificationRevoked);
    expect(event.eventType).toBe('identity.wallet.verification.revoked');
    expect(event.reason).toBe('security concern');
    expect(event.revokedAt).toEqual(at(T2));
  });

  it('clears verifiedAt', () => {
    const wallet = createVerifiedWallet();
    wallet.revokeVerification('reason', nextEventId(), at(T2));
    expect(wallet.verifiedAt).toBeNull();
  });

  it('demotes primary wallet when verification revoked', () => {
    const wallet = createPrimaryWallet();
    wallet.revokeVerification('reason', nextEventId(), at(T3));
    expect(wallet.primary).toBe(false);
    expect(wallet.primarySetAt).toBeNull();
  });

  it('throws when not verified', () => {
    const wallet = createWallet();
    expect(() => {
      wallet.revokeVerification('reason', nextEventId(), at(T1));
    }).toThrow(WalletNotVerifiedError);
  });

  it('throws when reason is empty', () => {
    const wallet = createVerifiedWallet();
    expect(() => {
      wallet.revokeVerification('  ', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unlinked', () => {
    const wallet = createVerifiedWallet();
    wallet.disconnect(nextEventId(), at(T2));
    expect(() => {
      wallet.revokeVerification('reason', nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — disconnect()', () => {
  it('marks wallet as unlinked', () => {
    const wallet = createWallet();
    wallet.disconnect(nextEventId(), at(T1));
    expect(wallet.unlinked).toBe(true);
  });

  it('emits WalletUnlinked event', () => {
    const wallet = createWallet();
    const eventId = nextEventId();
    wallet.disconnect(eventId, at(T1));

    const events = wallet.getUncommittedEvents();
    const event = events[1] as WalletUnlinked;
    expect(event).toBeInstanceOf(WalletUnlinked);
    expect(event.eventType).toBe('identity.wallet.unlinked');
    expect(event.unlinkedAt).toEqual(at(T1));
  });

  it('sets unlinkedAt timestamp', () => {
    const wallet = createWallet();
    wallet.disconnect(nextEventId(), at(T1));
    expect(wallet.unlinkedAt).toEqual(at(T1));
  });

  it('demotes primary wallet when disconnected', () => {
    const wallet = createPrimaryWallet();
    wallet.disconnect(nextEventId(), at(T3));
    expect(wallet.primary).toBe(false);
    expect(wallet.primarySetAt).toBeNull();
  });

  it('throws when already unlinked', () => {
    const wallet = createWallet();
    wallet.disconnect(nextEventId(), at(T1));
    expect(() => {
      wallet.disconnect(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — setPrimary()', () => {
  it('marks verified wallet as primary', () => {
    const wallet = createVerifiedWallet();
    wallet.setPrimary(nextEventId(), at(T2));
    expect(wallet.primary).toBe(true);
  });

  it('emits WalletPrimarySet event', () => {
    const wallet = createVerifiedWallet();
    const eventId = nextEventId();
    wallet.setPrimary(eventId, at(T2));

    const events = wallet.getUncommittedEvents();
    const event = events[2] as WalletPrimarySet;
    expect(event).toBeInstanceOf(WalletPrimarySet);
    expect(event.eventType).toBe('identity.wallet.primary.set');
    expect(event.setAt).toEqual(at(T2));
  });

  it('sets primarySetAt timestamp', () => {
    const wallet = createVerifiedWallet();
    wallet.setPrimary(nextEventId(), at(T2));
    expect(wallet.primarySetAt).toEqual(at(T2));
  });

  it('throws when already primary', () => {
    const wallet = createPrimaryWallet();
    expect(() => {
      wallet.setPrimary(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when not verified', () => {
    const wallet = createWallet();
    expect(() => {
      wallet.setPrimary(nextEventId(), at(T1));
    }).toThrow(WalletNotVerifiedError);
  });

  it('throws when unlinked', () => {
    const wallet = createVerifiedWallet();
    wallet.disconnect(nextEventId(), at(T2));
    expect(() => {
      wallet.setPrimary(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — unsetPrimary()', () => {
  it('removes primary status', () => {
    const wallet = createPrimaryWallet();
    wallet.unsetPrimary(nextEventId(), at(T3));
    expect(wallet.primary).toBe(false);
  });

  it('emits WalletPrimaryUnset event', () => {
    const wallet = createPrimaryWallet();
    const eventId = nextEventId();
    wallet.unsetPrimary(eventId, at(T3));

    const events = wallet.getUncommittedEvents();
    const event = events[3] as WalletPrimaryUnset;
    expect(event).toBeInstanceOf(WalletPrimaryUnset);
    expect(event.eventType).toBe('identity.wallet.primary.unset');
    expect(event.unsetAt).toEqual(at(T3));
  });

  it('clears primarySetAt', () => {
    const wallet = createPrimaryWallet();
    wallet.unsetPrimary(nextEventId(), at(T3));
    expect(wallet.primarySetAt).toBeNull();
  });

  it('throws when not primary', () => {
    const wallet = createVerifiedWallet();
    expect(() => {
      wallet.unsetPrimary(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unlinked', () => {
    const wallet = createPrimaryWallet();
    wallet.disconnect(nextEventId(), at(T3));
    expect(() => {
      wallet.unsetPrimary(nextEventId(), at(T4));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — addSupportedChain()', () => {
  it('adds a new chain to supportedChains', () => {
    const wallet = createVerifiedWallet();
    const chain137 = new ChainId(137);
    wallet.addSupportedChain(chain137, nextEventId(), at(T2));
    expect(wallet.supportedChains).toHaveLength(1);
    expect(wallet.supportedChains[0]?.value).toBe(137);
  });

  it('emits WalletChainAdded event', () => {
    const wallet = createVerifiedWallet();
    const chain137 = new ChainId(137);
    wallet.addSupportedChain(chain137, nextEventId(), at(T2));

    const events = wallet.getUncommittedEvents();
    const event = events[2] as WalletChainAdded;
    expect(event).toBeInstanceOf(WalletChainAdded);
    expect(event.eventType).toBe('identity.wallet.chain.added');
    expect(event.chainId.value).toBe(137);
    expect(event.addedAt).toEqual(at(T2));
  });

  it('allows adding multiple different chains', () => {
    const wallet = createVerifiedWallet();
    wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T2));
    wallet.addSupportedChain(new ChainId(42161), nextEventId(), at(T3));
    expect(wallet.supportedChains).toHaveLength(2);
  });

  it('throws when chain already added', () => {
    const wallet = createVerifiedWallet();
    wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T2));
    expect(() => {
      wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when not verified', () => {
    const wallet = createWallet();
    expect(() => {
      wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T1));
    }).toThrow(WalletNotVerifiedError);
  });

  it('throws when unlinked', () => {
    const wallet = createVerifiedWallet();
    wallet.disconnect(nextEventId(), at(T2));
    expect(() => {
      wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — updateMetadata()', () => {
  it('updates label', () => {
    const wallet = createWallet({ label: null });
    wallet.updateMetadata('Hardware Wallet', nextEventId(), at(T1));
    expect(wallet.label).toBe('Hardware Wallet');
  });

  it('emits WalletMetadataUpdated event', () => {
    const wallet = createWallet({ label: null });
    const eventId = nextEventId();
    wallet.updateMetadata('Hardware Wallet', eventId, at(T1));

    const events = wallet.getUncommittedEvents();
    const event = events[1] as WalletMetadataUpdated;
    expect(event).toBeInstanceOf(WalletMetadataUpdated);
    expect(event.eventType).toBe('identity.wallet.metadata.updated');
    expect(event.label).toBe('Hardware Wallet');
    expect(event.updatedAt).toEqual(at(T1));
  });

  it('allows setting label to null', () => {
    const wallet = createWallet({ label: 'Old Label' });
    wallet.updateMetadata(null, nextEventId(), at(T1));
    expect(wallet.label).toBeNull();
  });

  it('trims whitespace from label', () => {
    const wallet = createWallet({ label: null });
    wallet.updateMetadata('  Spaced  ', nextEventId(), at(T1));
    expect(wallet.label).toBe('Spaced');
  });

  it('is a no-op when label is unchanged', () => {
    const wallet = createWallet({ label: 'Same' });
    wallet.updateMetadata('Same', nextEventId(), at(T1));
    expect(wallet.getUncommittedEvents()).toHaveLength(1);
  });

  it('is a no-op when both labels are null', () => {
    const wallet = createWallet({ label: null });
    wallet.updateMetadata(null, nextEventId(), at(T1));
    expect(wallet.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when label is empty string', () => {
    const wallet = createWallet({ label: null });
    expect(() => {
      wallet.updateMetadata('   ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unlinked', () => {
    const wallet = createWallet();
    wallet.disconnect(nextEventId(), at(T1));
    expect(() => {
      wallet.updateMetadata('New', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Wallet Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createVerifiedWallet();
    original.setPrimary(nextEventId(), at(T2));
    original.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    original.updateMetadata('Updated', nextEventId(), at(T4));

    const history = original.getUncommittedEvents();
    const rebuilt = Wallet.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.address.toString()).toBe(original.address.toString());
    expect(rebuilt.chainId.value).toBe(original.chainId.value);
    expect(rebuilt.verified).toBe(true);
    expect(rebuilt.primary).toBe(true);
    expect(rebuilt.unlinked).toBe(false);
    expect(rebuilt.supportedChains).toHaveLength(1);
    expect(rebuilt.label).toBe('Updated');
  });

  it('rebuilds unlinked state from history', () => {
    const original = createVerifiedWallet();
    original.disconnect(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Wallet.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.unlinked).toBe(true);
    expect(rebuilt.unlinkedAt).toEqual(at(T2));
  });

  it('rebuilds verification-revoked state from history', () => {
    const original = createVerifiedWallet();
    original.revokeVerification('reason', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Wallet.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.verified).toBe(false);
    expect(rebuilt.verifiedAt).toBeNull();
  });

  it('rebuilds primary-then-unset state from history', () => {
    const original = createPrimaryWallet();
    original.unsetPrimary(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Wallet.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.primary).toBe(false);
    expect(rebuilt.primarySetAt).toBeNull();
  });

  it('rebuilds primary-then-revoked state from history (revocation demotes primary)', () => {
    const original = createPrimaryWallet();
    original.revokeVerification('reason', nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Wallet.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.verified).toBe(false);
    expect(rebuilt.primary).toBe(false);
  });

  it('produces identical state across multiple replays', () => {
    const original = createVerifiedWallet();
    original.setPrimary(nextEventId(), at(T2));
    original.addSupportedChain(new ChainId(137), nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const first = Wallet.reconstitute(original.id);
    first.loadFromHistory(history);

    const second = Wallet.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.verified).toBe(second.verified);
    expect(first.primary).toBe(second.primary);
    expect(first.supportedChains.length).toBe(second.supportedChains.length);
  });
});

describe('Wallet Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createVerifiedWallet();
    original.setPrimary(nextEventId(), at(T2));
    original.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    original.updateMetadata('Main', nextEventId(), at(T4));

    const snapshot = original.toSnapshot();
    const restored = Wallet.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.address.toString()).toBe(original.address.toString());
    expect(restored.chainId.value).toBe(original.chainId.value);
    expect(restored.label).toBe(original.label);
    expect(restored.verified).toBe(original.verified);
    expect(restored.primary).toBe(original.primary);
    expect(restored.unlinked).toBe(original.unlinked);
    expect(restored.supportedChains.length).toBe(original.supportedChains.length);
    expect(restored.linkedAt.toISOString()).toBe(original.linkedAt.toISOString());
    expect(restored.verifiedAt?.toISOString()).toBe(original.verifiedAt?.toISOString());
    expect(restored.primarySetAt?.toISOString()).toBe(original.primarySetAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes unlinked state correctly', () => {
    const original = createWallet();
    original.disconnect(nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = Wallet.fromSnapshot(snapshot);

    expect(restored.unlinked).toBe(true);
    expect(restored.unlinkedAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes unverified wallet correctly', () => {
    const original = createWallet();

    const snapshot = original.toSnapshot();
    const restored = Wallet.fromSnapshot(snapshot);

    expect(restored.verified).toBe(false);
    expect(restored.verifiedAt).toBeNull();
  });

  it('serializes supported chains correctly', () => {
    const original = createVerifiedWallet();
    original.addSupportedChain(new ChainId(137), nextEventId(), at(T2));
    original.addSupportedChain(new ChainId(42161), nextEventId(), at(T3));

    const snapshot = original.toSnapshot();
    const restored = Wallet.fromSnapshot(snapshot);

    expect(restored.supportedChains).toHaveLength(2);
    expect(restored.supportedChains[0]?.value).toBe(137);
    expect(restored.supportedChains[1]?.value).toBe(42161);
  });
});

describe('Wallet Aggregate — Equality', () => {
  it('two wallets with same id are equal', () => {
    const id = validWalletId();
    const a = Wallet.link(
      id,
      validUserId(),
      validAddress(),
      validChainId(),
      null,
      nextEventId(),
      at(T0),
    );
    const b = Wallet.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two wallets with different ids are not equal', () => {
    const a = createWallet();
    const b = createWallet();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const wallet = createWallet();
    expect(wallet.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const wallet = createWallet();
    expect(wallet.equals(undefined)).toBe(false);
  });
});

describe('Wallet Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const wallet = createVerifiedWallet();
    wallet.setPrimary(nextEventId(), at(T2));
    expect(wallet.getUncommittedEvents()).toHaveLength(3);

    wallet.markEventsAsCommitted();
    expect(wallet.getUncommittedEvents()).toHaveLength(0);
    expect(wallet.version).toBe(3);
  });
});

describe('Wallet Aggregate — Full lifecycle integration', () => {
  it('supports full lifecycle: link → verify → setPrimary → addChain → updateMetadata → unsetPrimary → revokeVerification', () => {
    const wallet = createWallet({ label: 'Initial' });

    wallet.verifyOwnership(nextEventId(), at(T1));
    expect(wallet.verified).toBe(true);

    wallet.setPrimary(nextEventId(), at(T2));
    expect(wallet.primary).toBe(true);

    wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    expect(wallet.supportedChains).toHaveLength(1);

    wallet.updateMetadata('Updated Label', nextEventId(), at(T4));
    expect(wallet.label).toBe('Updated Label');

    wallet.unsetPrimary(nextEventId(), at(T5));
    expect(wallet.primary).toBe(false);

    wallet.revokeVerification('rotation', nextEventId(), at(T5));
    expect(wallet.verified).toBe(false);

    expect(wallet.version).toBe(7);
    expect(wallet.getUncommittedEvents()).toHaveLength(7);
  });

  it('supports disconnect after full setup', () => {
    const wallet = createPrimaryWallet();
    wallet.addSupportedChain(new ChainId(137), nextEventId(), at(T3));
    wallet.updateMetadata('Main', nextEventId(), at(T4));

    wallet.disconnect(nextEventId(), at(T5));

    expect(wallet.unlinked).toBe(true);
    expect(wallet.primary).toBe(false);
    expect(wallet.unlinkedAt).toEqual(at(T5));
  });

  it('supports re-verification after revocation', () => {
    const wallet = createVerifiedWallet();
    wallet.revokeVerification('reason', nextEventId(), at(T2));
    expect(wallet.verified).toBe(false);

    wallet.verifyOwnership(nextEventId(), at(T3));
    expect(wallet.verified).toBe(true);
    expect(wallet.verifiedAt).toEqual(at(T3));
  });
});

describe('Wallet Aggregate — Multiple wallets with different addresses', () => {
  it('two wallets with different addresses are distinct', () => {
    const userId = validUserId();
    const wallet1 = createWallet({ userId, address: validAddress() });
    const wallet2 = createWallet({ userId, address: altAddress() });

    expect(wallet1.address.equals(wallet2.address)).toBe(false);
    expect(wallet1.equals(wallet2)).toBe(false);
  });
});
