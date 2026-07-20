import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { MAX_RESEND_COUNT, Recovery } from '../../aggregates/recovery';
import {
  RecoveryCancelled,
  RecoveryCompleted,
  RecoveryExpired,
  RecoveryRequested,
  RecoveryResent,
  RecoveryVerified,
} from '../../events/recovery-events';
import { RecoveryId, UserId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';

const validRecoveryId = (): RecoveryId => new RecoveryId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());

function createRecovery(overrides?: { id?: RecoveryId; userId?: UserId }): Recovery {
  return Recovery.create(
    overrides?.id ?? validRecoveryId(),
    overrides?.userId ?? validUserId(),
    nextEventId(),
    at(T0),
  );
}

function createPendingRecovery(): Recovery {
  return createRecovery();
}

function createVerifiedRecovery(): Recovery {
  const r = createRecovery();
  r.verify(nextEventId(), at(T1));
  return r;
}

function createCompletedRecovery(): Recovery {
  const r = createRecovery();
  r.verify(nextEventId(), at(T1));
  r.complete(nextEventId(), at(T2));
  return r;
}

function createExpiredRecovery(): Recovery {
  const r = createRecovery();
  r.expire(nextEventId(), at(T1));
  return r;
}

function createCancelledRecovery(): Recovery {
  const r = createRecovery();
  r.cancel(nextEventId(), at(T1));
  return r;
}

describe('Recovery Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validRecoveryId();
    const userId = validUserId();
    const r = Recovery.create(id, userId, nextEventId(), at(T0));

    expect(r.id).toBe(id);
    expect(r.userId).toBe(userId);
    expect(r.verified).toBe(false);
    expect(r.completed).toBe(false);
    expect(r.expired).toBe(false);
    expect(r.cancelled).toBe(false);
    expect(r.resendCount).toBe(0);
    expect(r.pending).toBe(true);
  });

  it('initializes timestamps correctly', () => {
    const r = createRecovery();
    expect(r.createdAt).toEqual(at(T0));
    expect(r.verifiedAt).toBeNull();
    expect(r.completedAt).toBeNull();
    expect(r.expiredAt).toBeNull();
    expect(r.cancelledAt).toBeNull();
  });

  it('emits RecoveryRequested event with correct payload', () => {
    const id = validRecoveryId();
    const userId = validUserId();
    const r = Recovery.create(id, userId, nextEventId(), at(T0));

    const events = r.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as RecoveryRequested;
    expect(event).toBeInstanceOf(RecoveryRequested);
    expect(event.eventType).toBe('identity.recovery.initiated');
    expect(event.aggregateType).toBe('Recovery');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.recoveryId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.initiatedAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const r = createRecovery();
    expect(r.version).toBe(1);
  });

  it('starts as pending', () => {
    const r = createRecovery();
    expect(r.pending).toBe(true);
  });
});

describe('Recovery Aggregate — resend()', () => {
  it('increments resendCount', () => {
    const r = createPendingRecovery();
    r.resend(nextEventId(), at(T1));
    expect(r.resendCount).toBe(1);
  });

  it('emits RecoveryResent event', () => {
    const r = createPendingRecovery();
    const eventId = nextEventId();
    r.resend(eventId, at(T1));

    const events = r.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as RecoveryResent;
    expect(event).toBeInstanceOf(RecoveryResent);
    expect(event.eventType).toBe('identity.recovery.resent');
    expect(event.aggregateVersion).toBe(2);
    expect(event.recoveryId).toBe(r.id);
    expect(event.userId).toBe(r.userId);
    expect(event.resendCount).toBe(1);
    expect(event.resentAt).toEqual(at(T1));
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const r = createPendingRecovery();
    r.resend(nextEventId(), at(T1));
    expect(r.version).toBe(2);
  });

  it('increments resend count on each resend', () => {
    const r = createPendingRecovery();
    r.resend(nextEventId(), at(T1));
    r.resend(nextEventId(), at(T2));
    r.resend(nextEventId(), at(T3));
    expect(r.resendCount).toBe(3);
  });

  it('throws when max resend count is reached', () => {
    const r = createPendingRecovery();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      r.resend(nextEventId(), at(T1));
    }
    expect(r.resendCount).toBe(MAX_RESEND_COUNT);
    expect(() => {
      r.resend(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when completed', () => {
    const r = createCompletedRecovery();
    expect(() => {
      r.resend(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expired', () => {
    const r = createExpiredRecovery();
    expect(() => {
      r.resend(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when cancelled', () => {
    const r = createCancelledRecovery();
    expect(() => {
      r.resend(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Recovery Aggregate — verify()', () => {
  it('marks as verified', () => {
    const r = createPendingRecovery();
    r.verify(nextEventId(), at(T1));
    expect(r.verified).toBe(true);
    expect(r.verifiedAt).toEqual(at(T1));
    expect(r.pending).toBe(false);
  });

  it('emits RecoveryVerified event', () => {
    const r = createPendingRecovery();
    const eventId = nextEventId();
    r.verify(eventId, at(T1));

    const events = r.getUncommittedEvents();
    const event = events[1] as RecoveryVerified;
    expect(event).toBeInstanceOf(RecoveryVerified);
    expect(event.eventType).toBe('identity.recovery.verified');
    expect(event.aggregateVersion).toBe(2);
    expect(event.recoveryId).toBe(r.id);
    expect(event.userId).toBe(r.userId);
    expect(event.verifiedAt).toEqual(at(T1));
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const r = createPendingRecovery();
    r.verify(nextEventId(), at(T1));
    expect(r.version).toBe(2);
  });

  it('throws when already verified', () => {
    const r = createVerifiedRecovery();
    expect(() => {
      r.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when completed', () => {
    const r = createCompletedRecovery();
    expect(() => {
      r.verify(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expired', () => {
    const r = createExpiredRecovery();
    expect(() => {
      r.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when cancelled', () => {
    const r = createCancelledRecovery();
    expect(() => {
      r.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Recovery Aggregate — complete()', () => {
  it('marks as completed', () => {
    const r = createVerifiedRecovery();
    r.complete(nextEventId(), at(T2));
    expect(r.completed).toBe(true);
    expect(r.completedAt).toEqual(at(T2));
    expect(r.pending).toBe(false);
  });

  it('emits RecoveryCompleted event', () => {
    const r = createVerifiedRecovery();
    const eventId = nextEventId();
    r.complete(eventId, at(T2));

    const events = r.getUncommittedEvents();
    const event = events[2] as RecoveryCompleted;
    expect(event).toBeInstanceOf(RecoveryCompleted);
    expect(event.eventType).toBe('identity.recovery.completed');
    expect(event.aggregateVersion).toBe(3);
    expect(event.recoveryId).toBe(r.id);
    expect(event.userId).toBe(r.userId);
    expect(event.completedAt).toEqual(at(T2));
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const r = createVerifiedRecovery();
    r.complete(nextEventId(), at(T2));
    expect(r.version).toBe(3);
  });

  it('throws when not verified', () => {
    const r = createPendingRecovery();
    expect(() => {
      r.complete(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already completed', () => {
    const r = createCompletedRecovery();
    expect(() => {
      r.complete(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expired', () => {
    const r = createExpiredRecovery();
    expect(() => {
      r.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when cancelled', () => {
    const r = createCancelledRecovery();
    expect(() => {
      r.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Recovery Aggregate — expire()', () => {
  it('marks as expired', () => {
    const r = createPendingRecovery();
    r.expire(nextEventId(), at(T1));
    expect(r.expired).toBe(true);
    expect(r.expiredAt).toEqual(at(T1));
    expect(r.pending).toBe(false);
  });

  it('emits RecoveryExpired event', () => {
    const r = createPendingRecovery();
    const eventId = nextEventId();
    r.expire(eventId, at(T1));

    const events = r.getUncommittedEvents();
    const event = events[1] as RecoveryExpired;
    expect(event).toBeInstanceOf(RecoveryExpired);
    expect(event.eventType).toBe('identity.recovery.expired');
    expect(event.aggregateVersion).toBe(2);
    expect(event.recoveryId).toBe(r.id);
    expect(event.userId).toBe(r.userId);
    expect(event.expiredAt).toEqual(at(T1));
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const r = createPendingRecovery();
    r.expire(nextEventId(), at(T1));
    expect(r.version).toBe(2);
  });

  it('throws when completed', () => {
    const r = createCompletedRecovery();
    expect(() => {
      r.expire(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already expired', () => {
    const r = createExpiredRecovery();
    expect(() => {
      r.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when cancelled', () => {
    const r = createCancelledRecovery();
    expect(() => {
      r.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Recovery Aggregate — cancel()', () => {
  it('marks as cancelled', () => {
    const r = createPendingRecovery();
    r.cancel(nextEventId(), at(T1));
    expect(r.cancelled).toBe(true);
    expect(r.cancelledAt).toEqual(at(T1));
    expect(r.pending).toBe(false);
  });

  it('emits RecoveryCancelled event', () => {
    const r = createPendingRecovery();
    const eventId = nextEventId();
    r.cancel(eventId, at(T1));

    const events = r.getUncommittedEvents();
    const event = events[1] as RecoveryCancelled;
    expect(event).toBeInstanceOf(RecoveryCancelled);
    expect(event.eventType).toBe('identity.recovery.cancelled');
    expect(event.aggregateVersion).toBe(2);
    expect(event.recoveryId).toBe(r.id);
    expect(event.userId).toBe(r.userId);
    expect(event.cancelledAt).toEqual(at(T1));
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const r = createPendingRecovery();
    r.cancel(nextEventId(), at(T1));
    expect(r.version).toBe(2);
  });

  it('throws when completed', () => {
    const r = createCompletedRecovery();
    expect(() => {
      r.cancel(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expired', () => {
    const r = createExpiredRecovery();
    expect(() => {
      r.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const r = createCancelledRecovery();
    expect(() => {
      r.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Recovery Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createPendingRecovery();
    original.verify(nextEventId(), at(T1));
    original.complete(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Recovery.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.verified).toBe(true);
    expect(rebuilt.completed).toBe(true);
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds expired state from history', () => {
    const original = createExpiredRecovery();

    const history = original.getUncommittedEvents();
    const rebuilt = Recovery.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.expired).toBe(true);
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds cancelled state from history', () => {
    const original = createCancelledRecovery();

    const history = original.getUncommittedEvents();
    const rebuilt = Recovery.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.cancelled).toBe(true);
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds resend count from history', () => {
    const original = createPendingRecovery();
    original.resend(nextEventId(), at(T1));
    original.resend(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Recovery.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.resendCount).toBe(2);
  });

  it('produces identical state across multiple replays', () => {
    const original = createPendingRecovery();
    original.verify(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = Recovery.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = Recovery.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.verified).toBe(second.verified);
    expect(first.pending).toBe(second.pending);
  });
});

describe('Recovery Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createPendingRecovery();
    original.verify(nextEventId(), at(T1));
    original.complete(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.verified).toBe(original.verified);
    expect(restored.completed).toBe(original.completed);
    expect(restored.expired).toBe(original.expired);
    expect(restored.cancelled).toBe(original.cancelled);
    expect(restored.resendCount).toBe(original.resendCount);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes pending state correctly', () => {
    const original = createPendingRecovery();

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.verified).toBe(false);
    expect(restored.completed).toBe(false);
    expect(restored.expired).toBe(false);
    expect(restored.cancelled).toBe(false);
    expect(restored.pending).toBe(true);
  });

  it('serializes expired state correctly', () => {
    const original = createExpiredRecovery();

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.expired).toBe(true);
    expect(restored.expiredAt?.toISOString()).toBe(T1);
  });

  it('serializes cancelled state correctly', () => {
    const original = createCancelledRecovery();

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.cancelled).toBe(true);
    expect(restored.cancelledAt?.toISOString()).toBe(T1);
  });

  it('serializes verified but not completed state correctly', () => {
    const original = createVerifiedRecovery();

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.verified).toBe(true);
    expect(restored.verifiedAt?.toISOString()).toBe(T1);
    expect(restored.completed).toBe(false);
  });

  it('restores version from snapshot', () => {
    const original = createPendingRecovery();
    original.verify(nextEventId(), at(T1));
    original.complete(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = Recovery.fromSnapshot(snapshot);

    expect(restored.version).toBe(3);
  });
});

describe('Recovery Aggregate — Equality', () => {
  it('two recoveries with same id are equal', () => {
    const id = validRecoveryId();
    const a = Recovery.create(id, validUserId(), nextEventId(), at(T0));
    const b = Recovery.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two recoveries with different ids are not equal', () => {
    const a = createRecovery();
    const b = createRecovery();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const r = createRecovery();
    expect(r.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const r = createRecovery();
    expect(r.equals(undefined)).toBe(false);
  });
});

describe('Recovery Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const r = createPendingRecovery();
    r.verify(nextEventId(), at(T1));
    expect(r.getUncommittedEvents()).toHaveLength(2);

    r.markEventsAsCommitted();
    expect(r.getUncommittedEvents()).toHaveLength(0);
    expect(r.version).toBe(2);
  });
});

describe('Recovery Aggregate — pending getter', () => {
  it('returns true for newly created recovery', () => {
    expect(createRecovery().pending).toBe(true);
  });

  it('returns false after verify', () => {
    expect(createVerifiedRecovery().pending).toBe(false);
  });

  it('returns false after complete', () => {
    expect(createCompletedRecovery().pending).toBe(false);
  });

  it('returns false after expire', () => {
    expect(createExpiredRecovery().pending).toBe(false);
  });

  it('returns false after cancel', () => {
    expect(createCancelledRecovery().pending).toBe(false);
  });
});

describe('Recovery Aggregate — Full lifecycle integration', () => {
  it('supports: request → verify → complete', () => {
    const r = createRecovery();

    expect(r.pending).toBe(true);

    r.verify(nextEventId(), at(T1));
    expect(r.verified).toBe(true);
    expect(r.pending).toBe(false);

    r.complete(nextEventId(), at(T2));
    expect(r.completed).toBe(true);

    expect(r.version).toBe(3);
    expect(r.getUncommittedEvents()).toHaveLength(3);
  });

  it('supports: request → resend → verify → complete', () => {
    const r = createRecovery();

    r.resend(nextEventId(), at(T1));
    expect(r.resendCount).toBe(1);

    r.verify(nextEventId(), at(T2));
    expect(r.verified).toBe(true);

    r.complete(nextEventId(), at(T3));
    expect(r.completed).toBe(true);

    expect(r.version).toBe(4);
  });

  it('supports: request → expire', () => {
    const r = createRecovery();

    r.expire(nextEventId(), at(T1));
    expect(r.expired).toBe(true);
    expect(r.pending).toBe(false);

    expect(r.version).toBe(2);
  });

  it('supports: request → cancel', () => {
    const r = createRecovery();

    r.cancel(nextEventId(), at(T1));
    expect(r.cancelled).toBe(true);
    expect(r.pending).toBe(false);

    expect(r.version).toBe(2);
  });

  it('blocks all mutations after completed (terminal)', () => {
    const r = createCompletedRecovery();

    expect(() => {
      r.resend(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.verify(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.complete(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.expire(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.cancel(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('blocks all mutations after expired (terminal)', () => {
    const r = createExpiredRecovery();

    expect(() => {
      r.resend(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('blocks all mutations after cancelled (terminal)', () => {
    const r = createCancelledRecovery();

    expect(() => {
      r.resend(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.complete(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      r.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('supports: request → resend → resend → verify → complete', () => {
    const r = createRecovery();

    r.resend(nextEventId(), at(T1));
    r.resend(nextEventId(), at(T2));
    expect(r.resendCount).toBe(2);

    r.verify(nextEventId(), at(T3));
    expect(r.verified).toBe(true);

    r.complete(nextEventId(), at(T4));
    expect(r.completed).toBe(true);

    expect(r.version).toBe(5);
  });

  it('prevents complete without verify step', () => {
    const r = createPendingRecovery();

    expect(() => {
      r.complete(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });
});
