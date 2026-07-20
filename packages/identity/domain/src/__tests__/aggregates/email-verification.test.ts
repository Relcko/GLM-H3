import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { EmailVerification } from '../../aggregates/email-verification';
import { MAX_RESEND_COUNT } from '../../aggregates/email-verification/email-verification';
import {
  EmailVerificationCompleted,
  EmailVerificationFailed,
  EmailVerificationInitiated,
} from '../../events/email-verification-events';
import { EmailAddress, EmailVerificationId, UserId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';

const validEvId = (): EmailVerificationId => new EmailVerificationId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const validEmail = (): EmailAddress => EmailAddress.fromRaw('test@example.com');
const validToken = (): string => crypto.randomUUID();

function createEmailVerification(overrides?: {
  id?: EmailVerificationId;
  userId?: UserId;
  email?: EmailAddress;
  token?: string;
  expiresAt?: Date;
}): EmailVerification {
  return EmailVerification.create(
    overrides?.id ?? validEvId(),
    overrides?.userId ?? validUserId(),
    overrides?.email ?? validEmail(),
    overrides?.token ?? validToken(),
    overrides?.expiresAt ?? at(T2),
    nextEventId(),
    at(T0),
  );
}

function createPendingEv(): EmailVerification {
  return createEmailVerification();
}

function createCompletedEv(): EmailVerification {
  const ev = createEmailVerification();
  ev.verify(nextEventId(), at(T1));
  return ev;
}

function createFailedEv(reason = 'expired'): EmailVerification {
  const ev = createEmailVerification();
  if (reason === 'cancelled') {
    ev.cancel(nextEventId(), at(T1));
  } else {
    ev.expire(nextEventId(), at(T1));
  }
  return ev;
}

describe('EmailVerification Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validEvId();
    const userId = validUserId();
    const email = validEmail();
    const token = validToken();
    const ev = EmailVerification.create(id, userId, email, token, at(T2), nextEventId(), at(T0));

    expect(ev.id).toBe(id);
    expect(ev.userId).toBe(userId);
    expect(ev.email.toString()).toBe(email.toString());
    expect(ev.token).toBe(token);
    expect(ev.completed).toBe(false);
    expect(ev.failed).toBe(false);
    expect(ev.pending).toBe(true);
    expect(ev.failureReason).toBeNull();
    expect(ev.resendCount).toBe(0);
    expect(ev.completedAt).toBeNull();
    expect(ev.failedAt).toBeNull();
  });

  it('initializes timestamps correctly', () => {
    const ev = createEmailVerification();
    expect(ev.createdAt).toEqual(at(T0));
    expect(ev.completedAt).toBeNull();
    expect(ev.failedAt).toBeNull();
  });

  it('emits EmailVerificationInitiated event with correct payload', () => {
    const id = validEvId();
    const userId = validUserId();
    const email = validEmail();
    const token = validToken();
    const ev = EmailVerification.create(id, userId, email, token, at(T2), nextEventId(), at(T0));

    const events = ev.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as EmailVerificationInitiated;
    expect(event).toBeInstanceOf(EmailVerificationInitiated);
    expect(event.eventType).toBe('identity.email.verification.initiated');
    expect(event.aggregateType).toBe('EmailVerification');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.emailVerificationId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.email.toString()).toBe(email.toString());
    expect(event.token).toBe(token);
    expect(event.expiresAt).toEqual(at(T2));
    expect(event.resendCount).toBe(0);
    expect(event.initiatedAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const ev = createEmailVerification();
    expect(ev.version).toBe(1);
  });

  it('trims whitespace from token', () => {
    const ev = createEmailVerification({ token: '  some-token  ' });
    expect(ev.token).toBe('some-token');
  });

  it('throws when token is empty', () => {
    expect(() => {
      createEmailVerification({ token: '  ' });
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt is in the past', () => {
    expect(() => {
      createEmailVerification({ expiresAt: at(T0) });
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt equals occurredAt', () => {
    expect(() => {
      EmailVerification.create(
        validEvId(),
        validUserId(),
        validEmail(),
        validToken(),
        at(T0),
        nextEventId(),
        at(T0),
      );
    }).toThrow(InvariantViolationError);
  });
});

describe('EmailVerification Aggregate — resend()', () => {
  it('increments resendCount and updates token and expiry', () => {
    const ev = createPendingEv();
    const newToken = validToken();
    ev.resend(newToken, at(T3), nextEventId(), at(T1));

    expect(ev.resendCount).toBe(1);
    expect(ev.token).toBe(newToken);
    expect(ev.expiresAt).toEqual(at(T3));
    expect(ev.pending).toBe(true);
  });

  it('emits EmailVerificationInitiated with incremented resendCount', () => {
    const ev = createPendingEv();
    const eventId = nextEventId();
    ev.resend(validToken(), at(T3), eventId, at(T1));

    const events = ev.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as EmailVerificationInitiated;
    expect(event).toBeInstanceOf(EmailVerificationInitiated);
    expect(event.eventType).toBe('identity.email.verification.initiated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.resendCount).toBe(1);
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const ev = createPendingEv();
    ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    expect(ev.version).toBe(2);
  });

  it('throws when already completed', () => {
    const ev = createCompletedEv();
    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already failed', () => {
    const ev = createFailedEv();
    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when token is empty', () => {
    const ev = createPendingEv();
    expect(() => {
      ev.resend('  ', at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when expiresAt is in the past', () => {
    const ev = createPendingEv();
    expect(() => {
      ev.resend(validToken(), at(T1), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when max resend count is reached', () => {
    const ev = createPendingEv();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(ev.resendCount).toBe(MAX_RESEND_COUNT);
    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });
});

describe('EmailVerification Aggregate — verify()', () => {
  it('marks as completed', () => {
    const ev = createPendingEv();
    ev.verify(nextEventId(), at(T1));
    expect(ev.completed).toBe(true);
    expect(ev.pending).toBe(false);
    expect(ev.failed).toBe(false);
  });

  it('emits EmailVerificationCompleted event', () => {
    const ev = createPendingEv();
    const eventId = nextEventId();
    ev.verify(eventId, at(T1));

    const events = ev.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as EmailVerificationCompleted;
    expect(event).toBeInstanceOf(EmailVerificationCompleted);
    expect(event.eventType).toBe('identity.email.verification.completed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
    expect(event.completedAt).toEqual(at(T1));
  });

  it('sets completedAt timestamp', () => {
    const ev = createPendingEv();
    ev.verify(nextEventId(), at(T1));
    expect(ev.completedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const ev = createPendingEv();
    ev.verify(nextEventId(), at(T1));
    expect(ev.version).toBe(2);
  });

  it('throws when already completed', () => {
    const ev = createCompletedEv();
    expect(() => {
      ev.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already failed', () => {
    const ev = createFailedEv();
    expect(() => {
      ev.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('EmailVerification Aggregate — expire()', () => {
  it('marks as failed with expired reason', () => {
    const ev = createPendingEv();
    ev.expire(nextEventId(), at(T1));
    expect(ev.failed).toBe(true);
    expect(ev.pending).toBe(false);
    expect(ev.completed).toBe(false);
    expect(ev.failureReason).toBe('expired');
  });

  it('emits EmailVerificationFailed event with expired reason', () => {
    const ev = createPendingEv();
    const eventId = nextEventId();
    ev.expire(eventId, at(T1));

    const events = ev.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as EmailVerificationFailed;
    expect(event).toBeInstanceOf(EmailVerificationFailed);
    expect(event.eventType).toBe('identity.email.verification.failed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.failureReason).toBe('expired');
    expect(event.eventId).toBe(eventId);
    expect(event.failedAt).toEqual(at(T1));
  });

  it('sets failedAt timestamp', () => {
    const ev = createPendingEv();
    ev.expire(nextEventId(), at(T1));
    expect(ev.failedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const ev = createPendingEv();
    ev.expire(nextEventId(), at(T1));
    expect(ev.version).toBe(2);
  });

  it('throws when already completed', () => {
    const ev = createCompletedEv();
    expect(() => {
      ev.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already failed', () => {
    const ev = createFailedEv('expired');
    expect(() => {
      ev.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('EmailVerification Aggregate — cancel()', () => {
  it('marks as failed with cancelled reason', () => {
    const ev = createPendingEv();
    ev.cancel(nextEventId(), at(T1));
    expect(ev.failed).toBe(true);
    expect(ev.pending).toBe(false);
    expect(ev.completed).toBe(false);
    expect(ev.failureReason).toBe('cancelled');
  });

  it('emits EmailVerificationFailed event with cancelled reason', () => {
    const ev = createPendingEv();
    const eventId = nextEventId();
    ev.cancel(eventId, at(T1));

    const events = ev.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as EmailVerificationFailed;
    expect(event).toBeInstanceOf(EmailVerificationFailed);
    expect(event.eventType).toBe('identity.email.verification.failed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.failureReason).toBe('cancelled');
    expect(event.eventId).toBe(eventId);
  });

  it('sets failedAt timestamp', () => {
    const ev = createPendingEv();
    ev.cancel(nextEventId(), at(T1));
    expect(ev.failedAt).toEqual(at(T1));
  });

  it('throws when already completed', () => {
    const ev = createCompletedEv();
    expect(() => {
      ev.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already failed', () => {
    const ev = createFailedEv('cancelled');
    expect(() => {
      ev.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('EmailVerification Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createEmailVerification();
    original.verify(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId.toString()).toBe(original.userId.toString());
    expect(rebuilt.email.toString()).toBe(original.email.toString());
    expect(rebuilt.token).toBe(original.token);
    expect(rebuilt.completed).toBe(true);
    expect(rebuilt.failed).toBe(false);
    expect(rebuilt.pending).toBe(false);
    expect(rebuilt.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
  });

  it('rebuilds failed state from history', () => {
    const original = createEmailVerification();
    original.expire(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.failed).toBe(true);
    expect(rebuilt.failureReason).toBe('expired');
    expect(rebuilt.pending).toBe(false);
  });

  it('rebuilds cancelled state from history', () => {
    const original = createEmailVerification();
    original.cancel(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.failed).toBe(true);
    expect(rebuilt.failureReason).toBe('cancelled');
  });

  it('rebuilds resent state from history', () => {
    const original = createEmailVerification();
    const newToken = validToken();
    original.resend(newToken, at(T3), nextEventId(), at(T1));
    original.resend(validToken(), at(T4), nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.resendCount).toBe(2);
    expect(rebuilt.token).toBe(original.token);
    expect(rebuilt.expiresAt.toISOString()).toBe(original.expiresAt.toISOString());
    expect(rebuilt.version).toBe(3);
  });

  it('produces identical state across multiple replays', () => {
    const original = createEmailVerification();
    original.verify(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = EmailVerification.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = EmailVerification.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.completed).toBe(second.completed);
    expect(first.failed).toBe(second.failed);
    expect(first.token).toBe(second.token);
  });

  it('pending getter returns true after initiation', () => {
    const ev = createPendingEv();
    expect(ev.pending).toBe(true);

    const history = ev.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(ev.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(true);
  });

  it('pending getter returns false after verify', () => {
    const ev = createCompletedEv();

    const history = ev.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(ev.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });

  it('pending getter returns false after expire', () => {
    const ev = createFailedEv('expired');

    const history = ev.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(ev.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });

  it('pending getter returns false after cancel', () => {
    const ev = createFailedEv('cancelled');

    const history = ev.getUncommittedEvents();
    const rebuilt = EmailVerification.reconstitute(ev.id);
    rebuilt.loadFromHistory(history);
    expect(rebuilt.pending).toBe(false);
  });
});

describe('EmailVerification Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createEmailVerification();
    original.resend(validToken(), at(T3), nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = EmailVerification.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId.toString()).toBe(original.userId.toString());
    expect(restored.email.toString()).toBe(original.email.toString());
    expect(restored.token).toBe(original.token);
    expect(restored.completed).toBe(original.completed);
    expect(restored.failed).toBe(original.failed);
    expect(restored.pending).toBe(original.pending);
    expect(restored.failureReason).toBe(original.failureReason);
    expect(restored.expiresAt.toISOString()).toBe(original.expiresAt.toISOString());
    expect(restored.resendCount).toBe(original.resendCount);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
    expect(restored.failedAt?.toISOString()).toBe(original.failedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes completed state correctly', () => {
    const original = createCompletedEv();

    const snapshot = original.toSnapshot();
    const restored = EmailVerification.fromSnapshot(snapshot);

    expect(restored.completed).toBe(true);
    expect(restored.pending).toBe(false);
    expect(restored.failed).toBe(false);
    expect(restored.completedAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes expired state correctly', () => {
    const original = createFailedEv('expired');

    const snapshot = original.toSnapshot();
    const restored = EmailVerification.fromSnapshot(snapshot);

    expect(restored.failed).toBe(true);
    expect(restored.failureReason).toBe('expired');
    expect(restored.pending).toBe(false);
    expect(restored.failedAt?.toISOString()).toBe(at(T1).toISOString());
  });

  it('serializes cancelled state correctly', () => {
    const original = createFailedEv('cancelled');

    const snapshot = original.toSnapshot();
    const restored = EmailVerification.fromSnapshot(snapshot);

    expect(restored.failed).toBe(true);
    expect(restored.failureReason).toBe('cancelled');
    expect(restored.pending).toBe(false);
  });

  it('restores version from snapshot', () => {
    const original = createCompletedEv();
    const snapshot = original.toSnapshot();
    const restored = EmailVerification.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('EmailVerification Aggregate — Equality', () => {
  it('two email verifications with same id are equal', () => {
    const id = validEvId();
    const a = EmailVerification.create(
      id,
      validUserId(),
      validEmail(),
      validToken(),
      at(T2),
      nextEventId(),
      at(T0),
    );
    const b = EmailVerification.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two email verifications with different ids are not equal', () => {
    const a = createEmailVerification();
    const b = createEmailVerification();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const ev = createEmailVerification();
    expect(ev.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const ev = createEmailVerification();
    expect(ev.equals(undefined)).toBe(false);
  });
});

describe('EmailVerification Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const ev = createCompletedEv();
    expect(ev.getUncommittedEvents()).toHaveLength(2);

    ev.markEventsAsCommitted();
    expect(ev.getUncommittedEvents()).toHaveLength(0);
    expect(ev.version).toBe(2);
  });
});

describe('EmailVerification Aggregate — Full lifecycle integration', () => {
  it('supports: create → resend → verify', () => {
    const ev = createEmailVerification({ token: 'initial-token' });

    expect(ev.pending).toBe(true);
    expect(ev.resendCount).toBe(0);

    ev.resend('resent-token', at(T3), nextEventId(), at(T1));
    expect(ev.resendCount).toBe(1);
    expect(ev.token).toBe('resent-token');

    ev.verify(nextEventId(), at(T2));
    expect(ev.completed).toBe(true);
    expect(ev.pending).toBe(false);

    expect(ev.version).toBe(3);
    expect(ev.getUncommittedEvents()).toHaveLength(3);
  });

  it('supports: create → expire', () => {
    const ev = createEmailVerification();
    ev.expire(nextEventId(), at(T1));

    expect(ev.failed).toBe(true);
    expect(ev.failureReason).toBe('expired');
    expect(ev.failedAt).toEqual(at(T1));
  });

  it('supports: create → cancel', () => {
    const ev = createEmailVerification();
    ev.cancel(nextEventId(), at(T1));

    expect(ev.failed).toBe(true);
    expect(ev.failureReason).toBe('cancelled');
  });

  it('supports: create → resend(5) → expire', () => {
    const ev = createEmailVerification();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(ev.resendCount).toBe(MAX_RESEND_COUNT);

    ev.expire(nextEventId(), at(T2));
    expect(ev.failed).toBe(true);
    expect(ev.failureReason).toBe('expired');
    expect(ev.version).toBe(7);
  });

  it('all operations after terminal state throw', () => {
    const ev = createCompletedEv();

    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('all operations after failed state throw', () => {
    const ev = createFailedEv('expired');

    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.verify(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      ev.cancel(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('supports: create → resend → resend → cancel', () => {
    const ev = createEmailVerification();
    ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    ev.resend(validToken(), at(T4), nextEventId(), at(T2));
    ev.cancel(nextEventId(), at(T3));
    expect(ev.failed).toBe(true);
    expect(ev.failureReason).toBe('cancelled');
    expect(ev.resendCount).toBe(2);
  });
});

describe('EmailVerification Aggregate — Resend limit', () => {
  it('allows exactly MAX_RESEND_COUNT resends while pending', () => {
    const ev = createPendingEv();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(ev.resendCount).toBe(MAX_RESEND_COUNT);
  });

  it('throws on attempt to exceed MAX_RESEND_COUNT', () => {
    const ev = createPendingEv();
    for (let i = 0; i < MAX_RESEND_COUNT; i++) {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }
    expect(() => {
      ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('resend limit is independent of verify/expire/cancel', () => {
    const ev = createPendingEv();
    ev.resend(validToken(), at(T3), nextEventId(), at(T1));
    ev.verify(nextEventId(), at(T2));
    expect(ev.completed).toBe(true);
  });
});

describe('EmailVerification Aggregate — Token invalidation on resend', () => {
  it('resend replaces current token', () => {
    const ev = createEmailVerification({ token: 'original-token' });
    expect(ev.token).toBe('original-token');
    ev.resend('new-token', at(T3), nextEventId(), at(T1));
    expect(ev.token).toBe('new-token');
  });

  it('multiple resends use only the latest token', () => {
    const ev = createEmailVerification({ token: 'token-0' });
    ev.resend('token-1', at(T3), nextEventId(), at(T1));
    ev.resend('token-2', at(T4), nextEventId(), at(T2));
    expect(ev.token).toBe('token-2');
  });
});
