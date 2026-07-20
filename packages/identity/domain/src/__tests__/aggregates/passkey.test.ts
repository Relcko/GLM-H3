import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { Passkey } from '../../aggregates/passkey';
import { PasskeyRevokedError } from '../../errors';
import {
  PasskeyActivated,
  PasskeyCredentialRotated,
  PasskeyDeactivated,
  PasskeyNameUpdated,
  PasskeyRegistered,
  PasskeyRevoked,
  PasskeyTransportsUpdated,
  PasskeyUsageRecorded,
  PasskeyVerified,
} from '../../events/passkey-events';
import {
  AAGUID,
  PasskeyId,
  PasskeyPublicKey,
  UserId,
  WebAuthnTransport,
} from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';
const T5 = '2026-01-06T00:00:00.000Z';
const T6 = '2026-01-07T00:00:00.000Z';

const validPasskeyId = (): PasskeyId => new PasskeyId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validPublicKey = (): PasskeyPublicKey =>
  new PasskeyPublicKey('MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE');
const validAaguid = (): AAGUID => new AAGUID('00000000-0000-0000-0000-000000000000');
const validCredentialId = (): string => crypto.randomUUID();

const transports: readonly WebAuthnTransport[] = [
  new WebAuthnTransport('usb'),
  new WebAuthnTransport('internal'),
];

function createPasskey(overrides?: {
  id?: PasskeyId;
  userId?: UserId;
  name?: string;
  credentialId?: string;
  publicKey?: PasskeyPublicKey;
  aaguid?: AAGUID | null;
  transports?: readonly WebAuthnTransport[];
}): Passkey {
  return Passkey.register(
    overrides?.id ?? validPasskeyId(),
    overrides?.userId ?? validUserId(),
    overrides?.name ?? 'My Passkey',
    overrides?.credentialId ?? validCredentialId(),
    overrides?.publicKey ?? validPublicKey(),
    overrides?.aaguid ?? null,
    overrides?.transports ?? transports,
    nextEventId(),
    at(T0),
  );
}

function createVerifiedPasskey(): Passkey {
  const pk = createPasskey();
  pk.verifyRegistration(nextEventId(), at(T1));
  return pk;
}

function createUsablePasskey(): Passkey {
  const pk = createVerifiedPasskey();
  pk.activate(nextEventId(), at(T2));
  return pk;
}

function createDeactivatedPasskey(): Passkey {
  const pk = createUsablePasskey();
  pk.deactivate(nextEventId(), at(T3));
  return pk;
}

function createRevokedPasskey(): Passkey {
  const pk = createPasskey();
  pk.revoke('device lost', nextEventId(), at(T1));
  return pk;
}

describe('Passkey Aggregate — Factory: register()', () => {
  it('creates a passkey with correct state', () => {
    const id = validPasskeyId();
    const userId = validUserId();
    const pk = Passkey.register(
      id,
      userId,
      'YubiKey 5C',
      validCredentialId(),
      validPublicKey(),
      validAaguid(),
      transports,
      nextEventId(),
      at(T0),
    );

    expect(pk.id).toBe(id);
    expect(pk.userId).toBe(userId);
    expect(pk.name).toBe('YubiKey 5C');
    expect(pk.credentialId).toBeTruthy();
    expect(pk.transports).toHaveLength(2);
    expect(pk.aaguid?.toString()).toBe(validAaguid().toString());
  });

  it('initializes with inactive, unverified, non-revoked state', () => {
    const pk = createPasskey();
    expect(pk.active).toBe(false);
    expect(pk.verified).toBe(false);
    expect(pk.revoked).toBe(false);
  });

  it('initializes timestamps correctly', () => {
    const pk = createPasskey();
    expect(pk.registeredAt).toEqual(at(T0));
    expect(pk.verifiedAt).toBeNull();
    expect(pk.lastUsedAt).toBeNull();
    expect(pk.revokedAt).toBeNull();
  });

  it('emits PasskeyRegistered event with correct payload', () => {
    const id = validPasskeyId();
    const userId = validUserId();
    const pk = Passkey.register(
      id,
      userId,
      'My Passkey',
      validCredentialId(),
      validPublicKey(),
      null,
      transports,
      nextEventId(),
      at(T0),
    );

    const events = pk.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as PasskeyRegistered;
    expect(event).toBeInstanceOf(PasskeyRegistered);
    expect(event.eventType).toBe('identity.passkey.registered');
    expect(event.aggregateType).toBe('Passkey');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.passkeyId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.name).toBe('My Passkey');
    expect(event.transports).toEqual(transports);
    expect(event.aaguid).toBeNull();
    expect(event.registeredAt).toEqual(at(T0));
  });

  it('starts at version 1 after registration', () => {
    const pk = createPasskey();
    expect(pk.version).toBe(1);
  });

  it('accepts null aaguid', () => {
    const pk = createPasskey({ aaguid: null });
    expect(pk.aaguid).toBeNull();
  });

  it('trims whitespace from name', () => {
    const pk = createPasskey({ name: '  My Key  ' });
    expect(pk.name).toBe('My Key');
  });

  it('throws when name is empty', () => {
    expect(() => {
      createPasskey({ name: '  ' });
    }).toThrow(InvariantViolationError);
  });
});

describe('Passkey Aggregate — verifyRegistration()', () => {
  it('marks passkey as verified', () => {
    const pk = createPasskey();
    pk.verifyRegistration(nextEventId(), at(T1));
    expect(pk.verified).toBe(true);
  });

  it('emits PasskeyVerified event', () => {
    const pk = createPasskey();
    const eventId = nextEventId();
    pk.verifyRegistration(eventId, at(T1));

    const events = pk.getUncommittedEvents();
    const event = events[1] as PasskeyVerified;
    expect(event).toBeInstanceOf(PasskeyVerified);
    expect(event.eventType).toBe('identity.passkey.verified');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(2);
    expect(event.verifiedAt).toEqual(at(T1));
  });

  it('sets verifiedAt timestamp', () => {
    const pk = createPasskey();
    pk.verifyRegistration(nextEventId(), at(T1));
    expect(pk.verifiedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const pk = createPasskey();
    pk.verifyRegistration(nextEventId(), at(T1));
    expect(pk.version).toBe(2);
  });

  it('throws when already verified', () => {
    const pk = createVerifiedPasskey();
    expect(() => {
      pk.verifyRegistration(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.verifyRegistration(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — activate()', () => {
  it('marks passkey as active', () => {
    const pk = createVerifiedPasskey();
    pk.activate(nextEventId(), at(T2));
    expect(pk.active).toBe(true);
  });

  it('emits PasskeyActivated event', () => {
    const pk = createVerifiedPasskey();
    const eventId = nextEventId();
    pk.activate(eventId, at(T2));

    const events = pk.getUncommittedEvents();
    const event = events[2] as PasskeyActivated;
    expect(event).toBeInstanceOf(PasskeyActivated);
    expect(event.eventType).toBe('identity.passkey.activated');
    expect(event.aggregateVersion).toBe(3);
  });

  it('throws when already active', () => {
    const pk = createUsablePasskey();
    expect(() => {
      pk.activate(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unverified', () => {
    const pk = createPasskey();
    expect(() => {
      pk.activate(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.activate(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — deactivate()', () => {
  it('marks passkey as not active', () => {
    const pk = createUsablePasskey();
    pk.deactivate(nextEventId(), at(T3));
    expect(pk.active).toBe(false);
  });

  it('emits PasskeyDeactivated event', () => {
    const pk = createUsablePasskey();
    const eventId = nextEventId();
    pk.deactivate(eventId, at(T3));

    const events = pk.getUncommittedEvents();
    const event = events[3] as PasskeyDeactivated;
    expect(event).toBeInstanceOf(PasskeyDeactivated);
    expect(event.eventType).toBe('identity.passkey.deactivated');
    expect(event.aggregateVersion).toBe(4);
    expect(event.deactivatedAt).toEqual(at(T3));
  });

  it('throws when not active', () => {
    const pk = createDeactivatedPasskey();
    expect(() => {
      pk.deactivate(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.deactivate(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — revoke()', () => {
  it('marks passkey as revoked and deactivates it', () => {
    const pk = createVerifiedPasskey();
    pk.revoke('device compromised', nextEventId(), at(T2));
    expect(pk.revoked).toBe(true);
    expect(pk.active).toBe(false);
  });

  it('emits PasskeyRevoked event with reason', () => {
    const pk = createPasskey();
    const eventId = nextEventId();
    pk.revoke('device lost', eventId, at(T1));

    const events = pk.getUncommittedEvents();
    const event = events[1] as PasskeyRevoked;
    expect(event).toBeInstanceOf(PasskeyRevoked);
    expect(event.eventType).toBe('identity.passkey.revoked');
    expect(event.reason).toBe('device lost');
    expect(event.revokedAt).toEqual(at(T1));
  });

  it('sets revokedAt and revokeReason', () => {
    const pk = createPasskey();
    pk.revoke('lost', nextEventId(), at(T1));
    expect(pk.revokedAt).toEqual(at(T1));
    expect(pk.revokeReason).toBe('lost');
  });

  it('throws when already revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.revoke('another reason', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when reason is empty', () => {
    const pk = createPasskey();
    expect(() => {
      pk.revoke('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('trims whitespace from reason', () => {
    const pk = createPasskey();
    pk.revoke('  lost device  ', nextEventId(), at(T1));
    expect(pk.revokeReason).toBe('lost device');
  });
});

describe('Passkey Aggregate — updateName()', () => {
  it('updates the friendly name', () => {
    const pk = createPasskey();
    pk.updateName('New Name', nextEventId(), at(T1));
    expect(pk.name).toBe('New Name');
  });

  it('emits PasskeyNameUpdated event', () => {
    const pk = createPasskey();
    const eventId = nextEventId();
    pk.updateName('New Name', eventId, at(T1));

    const events = pk.getUncommittedEvents();
    const event = events[1] as PasskeyNameUpdated;
    expect(event).toBeInstanceOf(PasskeyNameUpdated);
    expect(event.eventType).toBe('identity.passkey.name.updated');
    expect(event.name).toBe('New Name');
  });

  it('trims whitespace from name', () => {
    const pk = createPasskey();
    pk.updateName('  Spaced  ', nextEventId(), at(T1));
    expect(pk.name).toBe('Spaced');
  });

  it('is a no-op when name is unchanged', () => {
    const pk = createPasskey({ name: 'Same' });
    pk.updateName('Same', nextEventId(), at(T1));
    expect(pk.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when name is empty', () => {
    const pk = createPasskey();
    expect(() => {
      pk.updateName('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.updateName('New', nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — updateTransports()', () => {
  it('updates transports', () => {
    const pk = createPasskey();
    const newTransports = [new WebAuthnTransport('nfc')];
    pk.updateTransports(newTransports, nextEventId(), at(T1));
    expect(pk.transports).toHaveLength(1);
    expect(pk.transports[0]?.value).toBe('nfc');
  });

  it('emits PasskeyTransportsUpdated event', () => {
    const pk = createPasskey();
    const newTransports = [new WebAuthnTransport('hybrid')];
    const eventId = nextEventId();
    pk.updateTransports(newTransports, eventId, at(T1));

    const events = pk.getUncommittedEvents();
    const event = events[1] as PasskeyTransportsUpdated;
    expect(event).toBeInstanceOf(PasskeyTransportsUpdated);
    expect(event.eventType).toBe('identity.passkey.transports.updated');
    expect(event.transports).toEqual(newTransports);
  });

  it('is a no-op when transports are unchanged', () => {
    const pk = createPasskey({ transports });
    pk.updateTransports(transports, nextEventId(), at(T1));
    expect(pk.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when transports array is empty', () => {
    const pk = createPasskey();
    expect(() => {
      pk.updateTransports([], nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.updateTransports([new WebAuthnTransport('usb')], nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — rotateCredential()', () => {
  it('rotates credential ID and public key', () => {
    const pk = createUsablePasskey();
    const newCredentialId = crypto.randomUUID();
    const newPublicKey = new PasskeyPublicKey('AAAA');
    pk.rotateCredential(newCredentialId, newPublicKey, nextEventId(), at(T3));
    expect(pk.credentialId).toBe(newCredentialId);
    expect(pk.publicKey.toString()).toBe('AAAA');
  });

  it('emits PasskeyCredentialRotated event', () => {
    const pk = createUsablePasskey();
    const newCredentialId = crypto.randomUUID();
    const newPublicKey = new PasskeyPublicKey('AAAA');
    const eventId = nextEventId();
    pk.rotateCredential(newCredentialId, newPublicKey, eventId, at(T3));

    const events = pk.getUncommittedEvents();
    const event = events[3] as PasskeyCredentialRotated;
    expect(event).toBeInstanceOf(PasskeyCredentialRotated);
    expect(event.eventType).toBe('identity.passkey.credential.rotated');
    expect(event.credentialId).toBe(newCredentialId);
    expect(event.publicKey.toString()).toBe('AAAA');
  });

  it('throws when credential ID is empty', () => {
    const pk = createUsablePasskey();
    expect(() => {
      pk.rotateCredential('  ', validPublicKey(), nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when unverified', () => {
    const pk = createPasskey();
    expect(() => {
      pk.rotateCredential(validCredentialId(), validPublicKey(), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when inactive', () => {
    const pk = createVerifiedPasskey();
    expect(() => {
      pk.rotateCredential(validCredentialId(), validPublicKey(), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.rotateCredential(validCredentialId(), validPublicKey(), nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — recordUsage()', () => {
  it('updates lastUsedAt timestamp', () => {
    const pk = createUsablePasskey();
    pk.recordUsage(nextEventId(), at(T3));
    expect(pk.lastUsedAt).toEqual(at(T3));
  });

  it('emits PasskeyUsageRecorded event', () => {
    const pk = createUsablePasskey();
    const eventId = nextEventId();
    pk.recordUsage(eventId, at(T3));

    const events = pk.getUncommittedEvents();
    const event = events[3] as PasskeyUsageRecorded;
    expect(event).toBeInstanceOf(PasskeyUsageRecorded);
    expect(event.eventType).toBe('identity.passkey.usage.recorded');
    expect(event.usedAt).toEqual(at(T3));
  });

  it('updates lastUsedAt on each call', () => {
    const pk = createUsablePasskey();
    pk.recordUsage(nextEventId(), at(T3));
    expect(pk.lastUsedAt).toEqual(at(T3));
    pk.recordUsage(nextEventId(), at(T4));
    expect(pk.lastUsedAt).toEqual(at(T4));
  });

  it('throws when unverified', () => {
    const pk = createPasskey();
    expect(() => {
      pk.recordUsage(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when inactive', () => {
    const pk = createVerifiedPasskey();
    expect(() => {
      pk.recordUsage(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const pk = createRevokedPasskey();
    expect(() => {
      pk.recordUsage(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});

describe('Passkey Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createPasskey();
    original.verifyRegistration(nextEventId(), at(T1));
    original.updateName('Renamed', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Passkey.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.name).toBe('Renamed');
    expect(rebuilt.verified).toBe(true);
    expect(rebuilt.active).toBe(original.active);
    expect(rebuilt.revoked).toBe(false);
  });

  it('rebuilds deactivated state from history', () => {
    const original = createUsablePasskey();
    original.deactivate(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Passkey.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.active).toBe(false);
  });

  it('rebuilds revoked state from history', () => {
    const original = createPasskey();
    original.revoke('reason', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = Passkey.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.revoked).toBe(true);
    expect(rebuilt.active).toBe(false);
    expect(rebuilt.revokeReason).toBe('reason');
    expect(rebuilt.revokedAt).toEqual(at(T1));
  });

  it('rebuilds credential rotation state from history', () => {
    const original = createUsablePasskey();
    const newCredId = crypto.randomUUID();
    const newPubKey = new PasskeyPublicKey('BBBB');
    original.rotateCredential(newCredId, newPubKey, nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Passkey.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.credentialId).toBe(newCredId);
    expect(rebuilt.publicKey.toString()).toBe('BBBB');
  });

  it('rebuilds usage-recorded state from history', () => {
    const original = createUsablePasskey();
    original.recordUsage(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Passkey.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.lastUsedAt).toEqual(at(T3));
  });

  it('produces identical state across multiple replays', () => {
    const original = createVerifiedPasskey();
    original.updateName('Updated', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const first = Passkey.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = Passkey.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.verified).toBe(second.verified);
    expect(first.name).toBe(second.name);
    expect(first.active).toBe(second.active);
  });
});

describe('Passkey Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createUsablePasskey();
    original.updateName('Renamed Key', nextEventId(), at(T2));
    original.recordUsage(nextEventId(), at(T3));

    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.name).toBe(original.name);
    expect(restored.credentialId).toBe(original.credentialId);
    expect(restored.publicKey.toString()).toBe(original.publicKey.toString());
    expect(restored.verified).toBe(original.verified);
    expect(restored.active).toBe(original.active);
    expect(restored.revoked).toBe(original.revoked);
    expect(restored.transports.map((t) => t.value)).toEqual(
      original.transports.map((t) => t.value),
    );
    expect(restored.registeredAt.toISOString()).toBe(original.registeredAt.toISOString());
    expect(restored.verifiedAt?.toISOString()).toBe(original.verifiedAt?.toISOString());
    expect(restored.lastUsedAt?.toISOString()).toBe(original.lastUsedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes revoked state correctly', () => {
    const original = createPasskey();
    original.revoke('lost device', nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);

    expect(restored.revoked).toBe(true);
    expect(restored.active).toBe(false);
    expect(restored.revokeReason).toBe('lost device');
    expect(restored.revokedAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes deactivated state correctly', () => {
    const original = createDeactivatedPasskey();

    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);

    expect(restored.active).toBe(false);
  });

  it('serializes aaguid correctly', () => {
    const original = createPasskey({ aaguid: validAaguid() });

    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);

    expect(restored.aaguid?.toString()).toBe(validAaguid().toString());
  });

  it('serializes null aaguid correctly', () => {
    const original = createPasskey({ aaguid: null });

    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);

    expect(restored.aaguid).toBeNull();
  });

  it('restores version from snapshot', () => {
    const original = createVerifiedPasskey();
    const snapshot = original.toSnapshot();
    const restored = Passkey.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('Passkey Aggregate — Equality', () => {
  it('two passkeys with same id are equal', () => {
    const id = validPasskeyId();
    const a = Passkey.register(
      id,
      validUserId(),
      'Key A',
      validCredentialId(),
      validPublicKey(),
      null,
      transports,
      nextEventId(),
      at(T0),
    );
    const b = Passkey.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two passkeys with different ids are not equal', () => {
    const a = createPasskey();
    const b = createPasskey();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const pk = createPasskey();
    expect(pk.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const pk = createPasskey();
    expect(pk.equals(undefined)).toBe(false);
  });
});

describe('Passkey Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const pk = createVerifiedPasskey();
    pk.updateName('New', nextEventId(), at(T2));
    expect(pk.getUncommittedEvents()).toHaveLength(3);

    pk.markEventsAsCommitted();
    expect(pk.getUncommittedEvents()).toHaveLength(0);
    expect(pk.version).toBe(3);
  });
});

describe('Passkey Aggregate — Full lifecycle integration', () => {
  it('supports full lifecycle: register → verify → activate → deactivate → reactivate → updateName → updateTransports → rotateCredential → recordUsage', () => {
    const pk = createPasskey({ name: 'Initial' });

    pk.verifyRegistration(nextEventId(), at(T1));
    expect(pk.verified).toBe(true);

    pk.activate(nextEventId(), at(T2));
    expect(pk.active).toBe(true);

    pk.deactivate(nextEventId(), at(T3));
    expect(pk.active).toBe(false);

    pk.activate(nextEventId(), at(T4));
    expect(pk.active).toBe(true);

    pk.updateName('Updated Key', nextEventId(), at(T4));
    expect(pk.name).toBe('Updated Key');

    const newTransports = [new WebAuthnTransport('hybrid')];
    pk.updateTransports(newTransports, nextEventId(), at(T4));
    expect(pk.transports).toHaveLength(1);

    const newCredId = crypto.randomUUID();
    const newPubKey = new PasskeyPublicKey('CCCC');
    pk.rotateCredential(newCredId, newPubKey, nextEventId(), at(T5));
    expect(pk.credentialId).toBe(newCredId);

    pk.recordUsage(nextEventId(), at(T6));
    expect(pk.lastUsedAt).toEqual(at(T6));

    expect(pk.version).toBe(9);
    expect(pk.getUncommittedEvents()).toHaveLength(9);
  });

  it('supports revoke after full setup', () => {
    const pk = createUsablePasskey();
    pk.updateName('Key', nextEventId(), at(T2));
    pk.revoke('compromised', nextEventId(), at(T3));

    expect(pk.revoked).toBe(true);
    expect(pk.active).toBe(false);
    expect(pk.revokeReason).toBe('compromised');
  });

  it('all operations after revoke throw PasskeyRevokedError', () => {
    const pk = createRevokedPasskey();

    expect(() => {
      pk.verifyRegistration(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.activate(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.deactivate(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.updateName('N', nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.updateTransports([new WebAuthnTransport('usb')], nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.rotateCredential(validCredentialId(), validPublicKey(), nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
    expect(() => {
      pk.recordUsage(nextEventId(), at(T2));
    }).toThrow(PasskeyRevokedError);
  });
});
