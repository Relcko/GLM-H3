import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { PasswordReset } from '../../aggregates/password-reset';
import { MAX_RESEND_COUNT } from '../../aggregates/password-reset/password-reset';
import {
  PasswordResetCancelled,
  PasswordResetCompleted,
  PasswordResetExpired,
  PasswordResetInitiated,
} from '../../events/password-reset-events';
import { PasswordResetId, UserId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';

const validPrId = (): PasswordResetId => new PasswordResetId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validToken = (): string => crypto.randomUUID();

function createPasswordReset(overrides?: {
  id?: PasswordResetId;
  userId?: UserId;
  token?: string;
  expiresAt?: Date;
}): PasswordReset {
  return PasswordReset.create(
    overrides?.id ?? validPrId(),
    overrides?.userId ?? validUserId(),
    overrides?.token ?? validToken(),
    overrides?.expiresAt ?? at(T2),
    nextEventId(),
    at(T0),
  );
}

function createPendingPr(): PasswordReset {
  return createPasswordReset();
}

function createCompletedPr(): PasswordReset {
  const pr = createPasswordReset();
  pr.complete(nextEventId(), at(T1));
  return pr;
}

function createExpiredPr(): PasswordReset {
  const pr = createPasswordReset();
  pr.expire(nextEventId(), at(T1));
  return pr;
}

function createCancelledPr(): PasswordReset {
  const pr = createPasswordReset();
  pr.cancel(nextEventId(), at(T1));
  return pr;
}

describe('PasswordReset Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validPrId();
    const userId = validUserId();
    const token = validToken();
    const pr = PasswordReset.create(id, userId, token, at(T2), nextEventId(), at(T0));

    expect(pr.id).toBe(id);
    expect(pr.userId).toBe(userId);
    expect(pr.token).toBe(token);
    expect(pr.completed).toBe(false);
    expect(pr.expired).toBe(false);
    expect(pr.cancelled).toBe(false);
    expect(pr.pending).toBe(true);
    expect(pr.resendCount).toBe(0);
    expect(pr.completedAt).toBeNull();
    expect(pr.expiredAt).toBeNull();
    expect(pr.cancelledAt).toBeNull();
  });

  it('initializes timestamps correctly', () => {
    const pr = createPasswordReset();
    expect(pr.createdAt).toEqual(at(T0));
    expect(pr.completedAt).toBeNull();
    expect(pr.expiredAt).toBeNull();
    expect(pr.cancelledAt).toBeNull();
  });

  it('emits PasswordResetInitiated event with correct payload', () => {
    const id = validPrId();
    const userId = validUserId();
    const token = validToken();
    const pr = PasswordReset.create(id, userId, token, at(T2), nextEventId(), at(T0));

    const events = pr.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as PasswordResetInitiated;
    expect(event).toBeInstanceOf(PasswordResetInitiated);
    expect(event.eventType).toBe('identity.password.reset.initiated');
    expect(event.aggregateType).toBe('PasswordReset');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.passwordResetId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.token).toBe(token);
    expect(event.expiresAt).toEqual(at(T2));
    expect(event.resendCount).toBe(0);
    expect(event.initiatedAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const pr = createPasswordReset();
    expect(pr.version).toBe(1);
  });

  it('trims whitespace from token', () => {
    const pr = createPasswordReset({ token: '  some-token  ' });
    expect(pr.token).toBe('some-token');
  });

  it('throws when token is empty', () => {
    expect(() => {
      createPasswordReset({ token: '  ' });
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt is in the past', () => {
    expect(() => {
      createPasswordReset({ expiresAt: at(T0) });
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt equals occurredAt', () => {
    expect(() => {
      PasswordReset.create(validPrId(), validUserId(), validToken(), at(T0), nextEventId(), at(T0));
    }).toThrow(InvariantViolationError);
  });
});

describe('PasswordReset Aggregate — resend()', () => {
  it('increments resendCount and updates token and expiry', () => {
    const pr = createPendingPr();
    const newToken = validToken();
    pr.resend(newToken, at(T3), nextEventId(), at(T1));

    expect(pr.resendCount).toBe(1);
    expect(pr.token).toBe(newToken);
    expect(pr.expiresAt).toEqual(at(T3));
    expect(pr.pending).toBe(true);
  });

  it('emits PasswordResetInitiated with incremented resendCount', () => {
    const pr = createPendingPr();
    const eventId = nextEventId();
    pr.resend(validToken(), at(T3), eventId, at(T1));

    const events = pr.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as PasswordResetInitiated;
    expect(event).toBeInstanceOf(PasswordResetInitiated);
    expect(event.eventType).toBe('identity.password.reset.initiated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.resendCount).toBe(1);
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const pr = createPendingPr();
    pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    expect(pr.version).toBe(2);
  });

  it('throws when already completed', () => {
    const pr = createCompletedPr();
    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already expired', () => {
    const pr = createExpiredPr();
    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const pr = createCancelledPr();
    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when token is empty', () => {
    const pr = createPendingPr();
    expect(() => {
      pr.resend('  ', at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt is in the past', () => {
    const pr = createPendingPr();
    expect(() => {
      pr.resend(validToken(), at(T1), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when max resend count is reached', () => {
    const pr = createPendingPr();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(pr.resendCount).toBe(MAX_RESEND_COUNT);
    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });
});

describe('PasswordReset Aggregate — complete()', () => {
  it('marks as completed', () => {
    const pr = createPendingPr();
    pr.complete(nextEventId(), at(T1));
    expect(pr.completed).toBe(true);
    expect(pr.pending).toBe(false);
    expect(pr.expired).toBe(false);
    expect(pr.cancelled).toBe(false);
  });

  it('emits PasswordResetCompleted event', () => {
    const pr = createPendingPr();
    const eventId = nextEventId();
    pr.complete(eventId, at(T1));

    const events = pr.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as PasswordResetCompleted;
    expect(event).toBeInstanceOf(PasswordResetCompleted);
    expect(event.eventType).toBe('identity.password.reset.completed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
    expect(event.completedAt).toEqual(at(T1));
  });

  it('sets completedAt timestamp', () => {
    const pr = createPendingPr();
    pr.complete(nextEventId(), at(T1));
    expect(pr.completedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const pr = createPendingPr();
    pr.complete(nextEventId(), at(T1));
    expect(pr.version).toBe(2);
  });

  it('throws when already completed', () => {
    const pr = createCompletedPr();
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already expired', () => {
    const pr = createExpiredPr();
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const pr = createCancelledPr();
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('PasswordReset Aggregate — expire()', () => {
  it('marks as expired', () => {
    const pr = createPendingPr();
    pr.expire(nextEventId(), at(T1));
    expect(pr.expired).toBe(true);
    expect(pr.pending).toBe(false);
    expect(pr.completed).toBe(false);
    expect(pr.cancelled).toBe(false);
  });

  it('emits PasswordResetExpired event', () => {
    const pr = createPendingPr();
    const eventId = nextEventId();
    pr.expire(eventId, at(T1));

    const events = pr.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as PasswordResetExpired;
    expect(event).toBeInstanceOf(PasswordResetExpired);
    expect(event.eventType).toBe('identity.password.reset.expired');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
    expect(event.expiredAt).toEqual(at(T1));
  });

  it('sets expiredAt timestamp', () => {
    const pr = createPendingPr();
    pr.expire(nextEventId(), at(T1));
    expect(pr.expiredAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const pr = createPendingPr();
    pr.expire(nextEventId(), at(T1));
    expect(pr.version).toBe(2);
  });

  it('throws when already completed', () => {
    const pr = createCompletedPr();
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already expired', () => {
    const pr = createExpiredPr();
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const pr = createCancelledPr();
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('PasswordReset Aggregate — cancel()', () => {
  it('marks as cancelled', () => {
    const pr = createPendingPr();
    pr.cancel(nextEventId(), at(T1));
    expect(pr.cancelled).toBe(true);
    expect(pr.pending).toBe(false);
    expect(pr.completed).toBe(false);
    expect(pr.expired).toBe(false);
  });

  it('emits PasswordResetCancelled event', () => {
    const pr = createPendingPr();
    const eventId = nextEventId();
    pr.cancel(eventId, at(T1));

    const events = pr.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as PasswordResetCancelled;
    expect(event).toBeInstanceOf(PasswordResetCancelled);
    expect(event.eventType).toBe('identity.password.reset.cancelled');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
    expect(event.cancelledAt).toEqual(at(T1));
  });

  it('sets cancelledAt timestamp', () => {
    const pr = createPendingPr();
    pr.cancel(nextEventId(), at(T1));
    expect(pr.cancelledAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const pr = createPendingPr();
    pr.cancel(nextEventId(), at(T1));
    expect(pr.version).toBe(2);
  });

  it('throws when already completed', () => {
    const pr = createCompletedPr();
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already expired', () => {
    const pr = createExpiredPr();
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const pr = createCancelledPr();
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('PasswordReset Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createPasswordReset();
    original.complete(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.token).toBe(original.token);
    expect(rebuilt.completed).toBe(true);
    expect(rebuilt.expired).toBe(false);
    expect(rebuilt.cancelled).toBe(false);
    expect(rebuilt.pending).toBe(false);
    expect(rebuilt.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
  });

  it('rebuilds expired state from history', () => {
    const original = createPasswordReset();
    original.expire(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.expired).toBe(true);
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds cancelled state from history', () => {
    const original = createPasswordReset();
    original.cancel(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.cancelled).toBe(true);
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds resent state from history', () => {
    const original = createPasswordReset();
    const newToken = validToken();
    original.resend(newToken, at(T3), nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.resendCount).toBe(1);
    expect(rebuilt.token).toBe(newToken);
    expect(rebuilt.expiresAt.toISOString()).toBe(original.expiresAt.toISOString());
    expect(rebuilt.version).toBe(2);
  });

  it('produces identical state across multiple replays', () => {
    const original = createPasswordReset();
    original.complete(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = PasswordReset.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = PasswordReset.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.completed).toBe(second.completed);
    expect(first.expired).toBe(second.expired);
    expect(first.cancelled).toBe(second.cancelled);
    expect(first.token).toBe(second.token);
  });

  it('pending getter returns true after initiation', () => {
    const pr = createPendingPr();
    expect(pr.pending).toBe(true);

    const history = pr.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(pr.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(true);
  });

  it('pending getter returns false after complete', () => {
    const pr = createCompletedPr();

    const history = pr.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(pr.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });

  it('pending getter returns false after expire', () => {
    const pr = createExpiredPr();

    const history = pr.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(pr.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });

  it('pending getter returns false after cancel', () => {
    const pr = createCancelledPr();

    const history = pr.getUncommittedEvents();
    const rebuilt = PasswordReset.reconstitute(pr.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });
});

describe('PasswordReset Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createPasswordReset();
    original.resend(validToken(), at(T3), nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = PasswordReset.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.token).toBe(original.token);
    expect(restored.completed).toBe(original.completed);
    expect(restored.expired).toBe(original.expired);
    expect(restored.cancelled).toBe(original.cancelled);
    expect(restored.pending).toBe(original.pending);
    expect(restored.expiresAt.toISOString()).toBe(original.expiresAt.toISOString());
    expect(restored.resendCount).toBe(original.resendCount);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
    expect(restored.expiredAt?.toISOString()).toBe(original.expiredAt?.toISOString());
    expect(restored.cancelledAt?.toISOString()).toBe(original.cancelledAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes completed state correctly', () => {
    const original = createCompletedPr();

    const snapshot = original.toSnapshot();
    const restored = PasswordReset.fromSnapshot(snapshot);

    expect(restored.completed).toBe(true);
    expect(restored.pending).toBe(false);
    expect(restored.expired).toBe(false);
    expect(restored.cancelled).toBe(false);
    expect(restored.completedAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes expired state correctly', () => {
    const original = createExpiredPr();

    const snapshot = original.toSnapshot();
    const restored = PasswordReset.fromSnapshot(snapshot);

    expect(restored.expired).toBe(true);
    expect(restored.pending).toBe(false);
    expect(restored.expiredAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes cancelled state correctly', () => {
    const original = createCancelledPr();

    const snapshot = original.toSnapshot();
    const restored = PasswordReset.fromSnapshot(snapshot);

    expect(restored.cancelled).toBe(true);
    expect(restored.pending).toBe(false);
    expect(restored.cancelledAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('restores version from snapshot', () => {
    const original = createCompletedPr();
    const snapshot = original.toSnapshot();
    const restored = PasswordReset.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('PasswordReset Aggregate — Equality', () => {
  it('two password resets with same id are equal', () => {
    const id = validPrId();
    const a = PasswordReset.create(id, validUserId(), validToken(), at(T2), nextEventId(), at(T0));
    const b = PasswordReset.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two password resets with different ids are not equal', () => {
    const a = createPasswordReset();
    const b = createPasswordReset();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const pr = createPasswordReset();
    expect(pr.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const pr = createPasswordReset();
    expect(pr.equals(undefined)).toBe(false);
  });
});

describe('PasswordReset Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const pr = createCompletedPr();
    expect(pr.getUncommittedEvents()).toHaveLength(2);

    pr.markEventsAsCommitted();
    expect(pr.getUncommittedEvents()).toHaveLength(0);
    expect(pr.version).toBe(2);
  });
});

describe('PasswordReset Aggregate — Full lifecycle integration', () => {
  it('supports: create → resend → complete', () => {
    const pr = createPasswordReset({ token: 'initial-token' });

    expect(pr.pending).toBe(true);
    expect(pr.resendCount).toBe(0);

    pr.resend('resent-token', at(T3), nextEventId(), at(T1));
    expect(pr.resendCount).toBe(1);
    expect(pr.token).toBe('resent-token');

    pr.complete(nextEventId(), at(T2));
    expect(pr.completed).toBe(true);
    expect(pr.pending).toBe(false);

    expect(pr.version).toBe(3);
    expect(pr.getUncommittedEvents()).toHaveLength(3);
  });

  it('supports: create → expire', () => {
    const pr = createPasswordReset();
    pr.expire(nextEventId(), at(T1));

    expect(pr.expired).toBe(true);
    expect(pr.expiredAt).toEqual(at(T1));
  });

  it('supports: create → cancel', () => {
    const pr = createPasswordReset();
    pr.cancel(nextEventId(), at(T1));

    expect(pr.cancelled).toBe(true);
    expect(pr.cancelledAt).toEqual(at(T1));
  });

  it('supports: create → resend(5) → expire', () => {
    const pr = createPasswordReset();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(pr.resendCount).toBe(MAX_RESEND_COUNT);

    pr.expire(nextEventId(), at(T2));
    expect(pr.expired).toBe(true);
    expect(pr.version).toBe(7);
  });

  it('all operations after completed state throw', () => {
    const pr = createCompletedPr();

    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('all operations after expired state throw', () => {
    const pr = createExpiredPr();

    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('all operations after cancelled state throw', () => {
    const pr = createCancelledPr();

    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      pr.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('supports: create → resend → resend → cancel', () => {
    const pr = createPasswordReset();
    pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    pr.resend(validToken(), at(T4), nextEventId(), at(T2));
    pr.cancel(nextEventId(), at(T3));
    expect(pr.cancelled).toBe(true);
    expect(pr.resendCount).toBe(2);
  });
});

describe('PasswordReset Aggregate — Resend limit', () => {
  it('allows exactly MAX_RESEND_COUNT resends while pending', () => {
    const pr = createPendingPr();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(pr.resendCount).toBe(MAX_RESEND_COUNT);
  });

  it('throws on attempt to exceed MAX_RESEND_COUNT', () => {
    const pr = createPendingPr();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(() => {
      pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('resend limit is independent of complete/expire/cancel', () => {
    const pr = createPendingPr();
    pr.resend(validToken(), at(T3), nextEventId(), at(T1));
    pr.complete(nextEventId(), at(T2));
    expect(pr.completed).toBe(true);
  });
});

describe('PasswordReset Aggregate — Token invalidation on resend', () => {
  it('resend replaces current token', () => {
    const pr = createPasswordReset({ token: 'original-token' });
    expect(pr.token).toBe('original-token');
    pr.resend('new-token', at(T3), nextEventId(), at(T1));
    expect(pr.token).toBe('new-token');
  });

  it('multiple resends use only the latest token', () => {
    const pr = createPasswordReset({ token: 'token-0' });
    pr.resend('token-1', at(T3), nextEventId(), at(T1));
    pr.resend('token-2', at(T4), nextEventId(), at(T2));
    expect(pr.token).toBe('token-2');
  });
});
