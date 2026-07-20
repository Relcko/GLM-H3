import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { Session } from '../../aggregates/session';
import { SessionActiveError, SessionExpiredError, SessionRevokedError } from '../../errors';
import {
  SessionActivated,
  SessionClientUpdated,
  SessionCreated,
  SessionExpired,
  SessionLastActivityUpdated,
  SessionRefreshTokenRotated,
  SessionRefreshed,
  SessionRevoked,
} from '../../events/session-events';
import { RefreshTokenHash, SessionId, UserId } from '../../value-objects';

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

const validSessionId = (): SessionId => new SessionId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validTokenHash = (): RefreshTokenHash => new RefreshTokenHash(crypto.randomUUID());

const FUTURE = '2026-02-01T00:00:00.000Z';
const PAST = '2025-12-01T00:00:00.000Z';

function createSession(overrides?: {
  id?: SessionId;
  userId?: UserId;
  expiresAt?: Date;
  refreshTokenHash?: RefreshTokenHash | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
}): Session {
  return Session.create(
    overrides?.id ?? validSessionId(),
    overrides?.userId ?? validUserId(),
    overrides?.expiresAt ?? at(FUTURE),
    overrides?.refreshTokenHash ?? null,
    overrides?.ipAddress ?? null,
    overrides?.userAgent ?? null,
    overrides?.deviceName ?? null,
    nextEventId(),
    at(T0),
  );
}

function createActiveSession(): Session {
  const s = createSession();
  s.activate(nextEventId(), at(T1));
  return s;
}

function createExpiredSession(): Session {
  const s = createActiveSession();
  s.expire(nextEventId(), at(T2));
  return s;
}

function createRevokedSession(): Session {
  const s = createActiveSession();
  s.revoke('logout', nextEventId(), at(T2));
  return s;
}

describe('Session Aggregate — Factory: create()', () => {
  it('creates a session with correct state', () => {
    const id = validSessionId();
    const userId = validUserId();
    const tokenHash = validTokenHash();
    const s = Session.create(
      id,
      userId,
      at(FUTURE),
      tokenHash,
      '192.168.1.1',
      'Mozilla/5.0',
      'Chrome on Windows',
      nextEventId(),
      at(T0),
    );

    expect(s.id).toBe(id);
    expect(s.userId).toBe(userId);
    expect(s.refreshTokenHash?.toString()).toBe(tokenHash.toString());
    expect(s.ipAddress).toBe('192.168.1.1');
    expect(s.userAgent).toBe('Mozilla/5.0');
    expect(s.deviceName).toBe('Chrome on Windows');
  });

  it('initializes with inactive, non-expired, non-revoked state', () => {
    const s = createSession();
    expect(s.active).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.revoked).toBe(false);
  });

  it('initializes timestamps correctly', () => {
    const s = createSession();
    expect(s.createdAt).toEqual(at(T0));
    expect(s.activatedAt).toBeNull();
    expect(s.lastActivityAt).toBeNull();
    expect(s.refreshedAt).toBeNull();
    expect(s.revokedAt).toBeNull();
  });

  it('stores the given expiresAt', () => {
    const s = createSession({ expiresAt: at(T1) });
    expect(s.expiresAt).toEqual(at(T1));
  });

  it('emits SessionCreated event with correct payload', () => {
    const id = validSessionId();
    const userId = validUserId();
    const tokenHash = validTokenHash();
    const eventId = nextEventId();
    const s = Session.create(
      id,
      userId,
      at(FUTURE),
      tokenHash,
      '10.0.0.1',
      'curl/7.68',
      'CLI',
      eventId,
      at(T0),
    );

    const events = s.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as SessionCreated;
    expect(event).toBeInstanceOf(SessionCreated);
    expect(event.eventType).toBe('identity.session.created');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateId).toBe(id.toString());
    expect(event.aggregateType).toBe('Session');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.sessionId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.refreshTokenHash?.toString()).toBe(tokenHash.toString());
    expect(event.ipAddress).toBe('10.0.0.1');
    expect(event.userAgent).toBe('curl/7.68');
    expect(event.deviceName).toBe('CLI');
    expect(event.expiresAt).toEqual(at(FUTURE));
    expect(event.createdAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const s = createSession();
    expect(s.version).toBe(1);
  });

  it('accepts null metadata', () => {
    const s = createSession({
      refreshTokenHash: null,
      ipAddress: null,
      userAgent: null,
      deviceName: null,
    });
    expect(s.refreshTokenHash).toBeNull();
    expect(s.ipAddress).toBeNull();
    expect(s.userAgent).toBeNull();
    expect(s.deviceName).toBeNull();
  });

  it('throws when expiresAt is in the past', () => {
    expect(() => {
      createSession({ expiresAt: at(PAST) });
    }).toThrow(InvariantViolationError);
  });
});

describe('Session Aggregate — activate()', () => {
  it('marks session as active', () => {
    const s = createSession();
    s.activate(nextEventId(), at(T1));
    expect(s.active).toBe(true);
  });

  it('emits SessionActivated event', () => {
    const s = createSession();
    const eventId = nextEventId();
    s.activate(eventId, at(T1));

    const events = s.getUncommittedEvents();
    const event = events[1] as SessionActivated;
    expect(event).toBeInstanceOf(SessionActivated);
    expect(event.eventType).toBe('identity.session.activated');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(2);
    expect(event.activatedAt).toEqual(at(T1));
  });

  it('sets activatedAt timestamp', () => {
    const s = createSession();
    s.activate(nextEventId(), at(T1));
    expect(s.activatedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const s = createSession();
    s.activate(nextEventId(), at(T1));
    expect(s.version).toBe(2);
  });

  it('throws SessionActiveError when already active', () => {
    const s = createActiveSession();
    expect(() => {
      s.activate(nextEventId(), at(T2));
    }).toThrow(SessionActiveError);
  });

  it('throws when expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.activate(nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.activate(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — refresh()', () => {
  it('extends expiration', () => {
    const s = createActiveSession();
    s.refresh(at(T4), nextEventId(), at(T2));
    expect(s.expiresAt).toEqual(at(T4));
  });

  it('emits SessionRefreshed event', () => {
    const s = createActiveSession();
    const eventId = nextEventId();
    s.refresh(at(T4), eventId, at(T2));

    const events = s.getUncommittedEvents();
    const event = events[2] as SessionRefreshed;
    expect(event).toBeInstanceOf(SessionRefreshed);
    expect(event.eventType).toBe('identity.session.refreshed');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(3);
    expect(event.refreshedAt).toEqual(at(T2));
    expect(event.newExpiresAt).toEqual(at(T4));
  });

  it('sets refreshedAt', () => {
    const s = createActiveSession();
    s.refresh(at(T4), nextEventId(), at(T2));
    expect(s.refreshedAt).toEqual(at(T2));
  });

  it('throws when newExpiresAt is in the past', () => {
    const s = createActiveSession();
    expect(() => {
      s.refresh(at(PAST), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.refresh(at(T5), nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.refresh(at(T5), nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — revoke()', () => {
  it('marks session as revoked and deactivates', () => {
    const s = createActiveSession();
    s.revoke('user logged out', nextEventId(), at(T2));
    expect(s.revoked).toBe(true);
    expect(s.active).toBe(false);
  });

  it('emits SessionRevoked event with reason', () => {
    const s = createSession();
    const eventId = nextEventId();
    s.revoke('admin force', eventId, at(T1));

    const events = s.getUncommittedEvents();
    const event = events[1] as SessionRevoked;
    expect(event).toBeInstanceOf(SessionRevoked);
    expect(event.eventType).toBe('identity.session.revoked');
    expect(event.reason).toBe('admin force');
    expect(event.revokedAt).toEqual(at(T1));
  });

  it('sets revokedAt and revokeReason', () => {
    const s = createActiveSession();
    s.revoke('expired token', nextEventId(), at(T2));
    expect(s.revokedAt).toEqual(at(T2));
    expect(s.revokeReason).toBe('expired token');
  });

  it('throws when already revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.revoke('again', nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when reason is empty', () => {
    const s = createSession();
    expect(() => {
      s.revoke('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('trims whitespace from reason', () => {
    const s = createSession();
    s.revoke('  logout  ', nextEventId(), at(T1));
    expect(s.revokeReason).toBe('logout');
  });
});

describe('Session Aggregate — expire()', () => {
  it('marks session as expired and deactivates', () => {
    const s = createActiveSession();
    s.expire(nextEventId(), at(T2));
    expect(s.expired).toBe(true);
    expect(s.active).toBe(false);
  });

  it('emits SessionExpired event', () => {
    const s = createActiveSession();
    const eventId = nextEventId();
    s.expire(eventId, at(T2));

    const events = s.getUncommittedEvents();
    const event = events[2] as SessionExpired;
    expect(event).toBeInstanceOf(SessionExpired);
    expect(event.eventType).toBe('identity.session.expired');
    expect(event.aggregateVersion).toBe(3);
    expect(event.expiredAt).toEqual(at(T2));
  });

  it('throws when already expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.expire(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.expire(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — recordLastActivity()', () => {
  it('updates lastActivityAt', () => {
    const s = createActiveSession();
    s.recordLastActivity(nextEventId(), at(T2));
    expect(s.lastActivityAt).toEqual(at(T2));
  });

  it('emits SessionLastActivityUpdated event', () => {
    const s = createActiveSession();
    const eventId = nextEventId();
    s.recordLastActivity(eventId, at(T2));

    const events = s.getUncommittedEvents();
    const event = events[2] as SessionLastActivityUpdated;
    expect(event).toBeInstanceOf(SessionLastActivityUpdated);
    expect(event.eventType).toBe('identity.session.last_activity.updated');
    expect(event.lastActivityAt).toEqual(at(T2));
  });

  it('updates lastActivityAt on each call', () => {
    const s = createActiveSession();
    s.recordLastActivity(nextEventId(), at(T2));
    expect(s.lastActivityAt).toEqual(at(T2));
    s.recordLastActivity(nextEventId(), at(T3));
    expect(s.lastActivityAt).toEqual(at(T3));
  });

  it('throws when expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.recordLastActivity(nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.recordLastActivity(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — updateClientMetadata()', () => {
  it('updates IP, user agent, and device name', () => {
    const s = createActiveSession();
    s.updateClientMetadata('10.0.0.2', 'Firefox', 'Linux', nextEventId(), at(T2));
    expect(s.ipAddress).toBe('10.0.0.2');
    expect(s.userAgent).toBe('Firefox');
    expect(s.deviceName).toBe('Linux');
  });

  it('emits SessionClientUpdated event', () => {
    const s = createActiveSession();
    const eventId = nextEventId();
    s.updateClientMetadata('10.0.0.2', 'Firefox', 'Linux', eventId, at(T2));

    const events = s.getUncommittedEvents();
    const event = events[2] as SessionClientUpdated;
    expect(event).toBeInstanceOf(SessionClientUpdated);
    expect(event.eventType).toBe('identity.session.client.updated');
    expect(event.ipAddress).toBe('10.0.0.2');
    expect(event.userAgent).toBe('Firefox');
    expect(event.deviceName).toBe('Linux');
  });

  it('allows setting metadata to null', () => {
    const s = createSession({
      ipAddress: '1.2.3.4',
      userAgent: 'Safari',
      deviceName: 'Mac',
    });
    s.activate(nextEventId(), at(T1));
    s.updateClientMetadata(null, null, null, nextEventId(), at(T2));
    expect(s.ipAddress).toBeNull();
    expect(s.userAgent).toBeNull();
    expect(s.deviceName).toBeNull();
  });

  it('is a no-op when all fields are unchanged', () => {
    const s = createSession({
      ipAddress: '1.2.3.4',
      userAgent: 'Chrome',
      deviceName: 'Win',
    });
    s.activate(nextEventId(), at(T1));
    s.updateClientMetadata('1.2.3.4', 'Chrome', 'Win', nextEventId(), at(T2));
    expect(s.getUncommittedEvents()).toHaveLength(2);
  });

  it('throws when expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.updateClientMetadata('1.2.3.4', null, null, nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.updateClientMetadata('1.2.3.4', null, null, nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — rotateRefreshToken()', () => {
  it('rotates the refresh token hash', () => {
    const s = createActiveSession();
    const newHash = new RefreshTokenHash('new-token-hash');
    s.rotateRefreshToken(newHash, nextEventId(), at(T2));
    expect(s.refreshTokenHash?.toString()).toBe('new-token-hash');
  });

  it('emits SessionRefreshTokenRotated event', () => {
    const s = createActiveSession();
    const newHash = new RefreshTokenHash('new-token-hash');
    const eventId = nextEventId();
    s.rotateRefreshToken(newHash, eventId, at(T2));

    const events = s.getUncommittedEvents();
    const event = events[2] as SessionRefreshTokenRotated;
    expect(event).toBeInstanceOf(SessionRefreshTokenRotated);
    expect(event.eventType).toBe('identity.session.refresh_token.rotated');
    expect(event.refreshTokenHash.toString()).toBe('new-token-hash');
  });

  it('throws when expired', () => {
    const s = createExpiredSession();
    expect(() => {
      s.rotateRefreshToken(validTokenHash(), nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });

  it('throws when revoked', () => {
    const s = createRevokedSession();
    expect(() => {
      s.rotateRefreshToken(validTokenHash(), nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });
});

describe('Session Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createSession();
    original.activate(nextEventId(), at(T1));
    original.refresh(at(T5), nextEventId(), at(T2));
    original.recordLastActivity(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const rebuilt = Session.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.active).toBe(true);
    expect(rebuilt.expired).toBe(false);
    expect(rebuilt.revoked).toBe(false);
    expect(rebuilt.expiresAt).toEqual(at(T5));
    expect(rebuilt.lastActivityAt).toEqual(at(T3));
  });

  it('rebuilds expired state from history', () => {
    const original = createActiveSession();
    original.expire(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Session.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.expired).toBe(true);
    expect(rebuilt.active).toBe(false);
  });

  it('rebuilds revoked state from history', () => {
    const original = createActiveSession();
    original.revoke('admin revoked', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Session.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.revoked).toBe(true);
    expect(rebuilt.active).toBe(false);
    expect(rebuilt.revokeReason).toBe('admin revoked');
  });

  it('rebuilds client metadata from history', () => {
    const original = createSession();
    original.activate(nextEventId(), at(T1));
    original.updateClientMetadata('10.0.0.5', 'Edge', 'Win11', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Session.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.ipAddress).toBe('10.0.0.5');
    expect(rebuilt.userAgent).toBe('Edge');
    expect(rebuilt.deviceName).toBe('Win11');
  });

  it('rebuilds refresh token rotation from history', () => {
    const original = createActiveSession();
    const newHash = new RefreshTokenHash('rotated-hash');
    original.rotateRefreshToken(newHash, nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Session.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.refreshTokenHash?.toString()).toBe('rotated-hash');
  });

  it('produces identical state across multiple replays', () => {
    const original = createActiveSession();
    original.refresh(at(T5), nextEventId(), at(T2));
    original.recordLastActivity(nextEventId(), at(T3));

    const history = original.getUncommittedEvents();
    const first = Session.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = Session.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.active).toBe(second.active);
    expect(first.expiresAt).toEqual(second.expiresAt);
    expect(first.lastActivityAt).toEqual(second.lastActivityAt);
  });
});

describe('Session Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createSession();
    original.activate(nextEventId(), at(T1));
    original.refresh(at(T5), nextEventId(), at(T2));
    original.recordLastActivity(nextEventId(), at(T3));
    original.updateClientMetadata('1.2.3.4', 'Safari', 'Mac', nextEventId(), at(T4));

    const snapshot = original.toSnapshot();
    const restored = Session.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.active).toBe(original.active);
    expect(restored.expired).toBe(original.expired);
    expect(restored.revoked).toBe(original.revoked);
    expect(restored.ipAddress).toBe(original.ipAddress);
    expect(restored.userAgent).toBe(original.userAgent);
    expect(restored.deviceName).toBe(original.deviceName);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.activatedAt?.toISOString()).toBe(original.activatedAt?.toISOString());
    expect(restored.expiresAt.toISOString()).toBe(original.expiresAt.toISOString());
    expect(restored.lastActivityAt?.toISOString()).toBe(original.lastActivityAt?.toISOString());
    expect(restored.refreshedAt?.toISOString()).toBe(original.refreshedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes revoked state correctly', () => {
    const original = createActiveSession();
    original.revoke('security concern', nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = Session.fromSnapshot(snapshot);

    expect(restored.revoked).toBe(true);
    expect(restored.active).toBe(false);
    expect(restored.revokeReason).toBe('security concern');
    expect(restored.revokedAt?.toISOString()).toBe(at(T2).toISOString());
  });

  it('serializes expired state correctly', () => {
    const original = createActiveSession();
    original.expire(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = Session.fromSnapshot(snapshot);

    expect(restored.expired).toBe(true);
    expect(restored.active).toBe(false);
  });

  it('serializes new session (inactive) correctly', () => {
    const original = createSession();

    const snapshot = original.toSnapshot();
    const restored = Session.fromSnapshot(snapshot);

    expect(restored.active).toBe(false);
    expect(restored.expired).toBe(false);
    expect(restored.revoked).toBe(false);
    expect(restored.activatedAt).toBeNull();
    expect(restored.lastActivityAt).toBeNull();
  });

  it('restores version from snapshot', () => {
    const original = createActiveSession();
    const snapshot = original.toSnapshot();
    const restored = Session.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('Session Aggregate — Equality', () => {
  it('two sessions with same id are equal', () => {
    const id = validSessionId();
    const a = Session.create(
      id,
      validUserId(),
      at(FUTURE),
      null,
      null,
      null,
      null,
      nextEventId(),
      at(T0),
    );
    const b = Session.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two sessions with different ids are not equal', () => {
    const a = createSession();
    const b = createSession();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const s = createSession();
    expect(s.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const s = createSession();
    expect(s.equals(undefined)).toBe(false);
  });
});

describe('Session Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const s = createActiveSession();
    s.recordLastActivity(nextEventId(), at(T2));
    expect(s.getUncommittedEvents()).toHaveLength(3);

    s.markEventsAsCommitted();
    expect(s.getUncommittedEvents()).toHaveLength(0);
    expect(s.version).toBe(3);
  });
});

describe('Session Aggregate — Full lifecycle integration', () => {
  it('supports full lifecycle: create → activate → refresh → recordActivity → updateClient → rotateToken → expire', () => {
    const s = createSession({ ipAddress: '10.0.0.1', userAgent: 'curl', deviceName: 'CLI' });

    s.activate(nextEventId(), at(T1));
    expect(s.active).toBe(true);

    s.refresh(at(T6), nextEventId(), at(T2));
    expect(s.expiresAt).toEqual(at(T6));

    s.recordLastActivity(nextEventId(), at(T3));
    expect(s.lastActivityAt).toEqual(at(T3));

    s.updateClientMetadata('10.0.0.2', 'curl/7.0', 'CLI v2', nextEventId(), at(T4));
    expect(s.ipAddress).toBe('10.0.0.2');
    expect(s.userAgent).toBe('curl/7.0');
    expect(s.deviceName).toBe('CLI v2');

    const newHash = new RefreshTokenHash('new-hash');
    s.rotateRefreshToken(newHash, nextEventId(), at(T5));
    expect(s.refreshTokenHash?.toString()).toBe('new-hash');

    s.expire(nextEventId(), at(T6));
    expect(s.expired).toBe(true);
    expect(s.active).toBe(false);

    expect(s.version).toBe(7);
    expect(s.getUncommittedEvents()).toHaveLength(7);
  });

  it('supports revoke after partial setup', () => {
    const s = createActiveSession();
    s.refresh(at(T5), nextEventId(), at(T2));
    s.recordLastActivity(nextEventId(), at(T3));
    s.revoke('user logout', nextEventId(), at(T4));

    expect(s.revoked).toBe(true);
    expect(s.active).toBe(false);
    expect(s.revokeReason).toBe('user logout');
  });

  it('after revoke, all state-mutating operations throw', () => {
    const s = createRevokedSession();

    expect(() => {
      s.activate(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
    expect(() => {
      s.refresh(at(T5), nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
    expect(() => {
      s.expire(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
    expect(() => {
      s.recordLastActivity(nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
    expect(() => {
      s.updateClientMetadata('1.1.1.1', null, null, nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
    expect(() => {
      s.rotateRefreshToken(validTokenHash(), nextEventId(), at(T3));
    }).toThrow(SessionRevokedError);
  });

  it('after expire, mutable operations throw', () => {
    const s = createExpiredSession();

    expect(() => {
      s.activate(nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
    expect(() => {
      s.refresh(at(T5), nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
    expect(() => {
      s.recordLastActivity(nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
    expect(() => {
      s.updateClientMetadata('1.1.1.1', null, null, nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
    expect(() => {
      s.rotateRefreshToken(validTokenHash(), nextEventId(), at(T3));
    }).toThrow(SessionExpiredError);
  });
});
