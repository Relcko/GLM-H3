import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { AuthenticationAttempt } from '../../aggregates/authentication-attempt';
import {
  AuthenticationAttemptCancelled,
  AuthenticationAttemptExpired,
  AuthenticationAttemptLockoutTriggered,
  AuthenticationAttemptMethodRecorded,
  AuthenticationAttemptMfaChallengeBegun,
  AuthenticationAttemptMfaChallengeCompleted,
  AuthenticationAttemptMfaFailed,
  AuthenticationAttemptMfaRequired,
  AuthenticationAttemptRecorded,
  AuthenticationAttemptRiskScoreRecorded,
  AuthenticationAttemptThrottleTriggered,
  AuthenticationFailed,
  AuthenticationSucceeded,
} from '../../events/authentication-attempt-events';
import { AttemptId, AuthenticationFactor, AuthenticationMethod, UserId } from '../../value-objects';

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
const T7 = '2026-01-08T00:00:00.000Z';

const validAttemptId = (): AttemptId => new AttemptId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());
const passwordMethod = (): AuthenticationMethod => new AuthenticationMethod('password');
const passkeyMethod = (): AuthenticationMethod => new AuthenticationMethod('passkey');
const totpFactor = (): AuthenticationFactor => new AuthenticationFactor('possession');

function createAttempt(overrides?: {
  id?: AttemptId;
  userId?: UserId | null;
}): AuthenticationAttempt {
  return AuthenticationAttempt.start(
    overrides?.id ?? validAttemptId(),
    overrides?.userId === undefined ? validUserId() : overrides.userId,
    nextEventId(),
    at(T0),
  );
}

function createAttemptWithMethod(): AuthenticationAttempt {
  const a = createAttempt();
  a.recordMethod(passwordMethod(), nextEventId(), at(T1));
  return a;
}

function createAttemptWithMfaRequired(): AuthenticationAttempt {
  const a = createAttemptWithMethod();
  a.recordMfaRequirement(totpFactor(), nextEventId(), at(T2));
  return a;
}

function createAttemptWithMfaBegun(): AuthenticationAttempt {
  const a = createAttemptWithMfaRequired();
  a.beginMfaChallenge(nextEventId(), at(T3));
  return a;
}

function createAttemptWithMfaCompleted(): AuthenticationAttempt {
  const a = createAttemptWithMfaBegun();
  a.completeMfaChallenge(nextEventId(), at(T4));
  return a;
}

function createSucceededAttempt(): AuthenticationAttempt {
  const a = createAttemptWithMfaCompleted();
  a.recordSuccess(nextEventId(), at(T5));
  return a;
}

function createFailedAttempt(): AuthenticationAttempt {
  const a = createAttempt();
  a.recordFailure('bad password', nextEventId(), at(T1));
  return a;
}

function createExpiredAttempt(): AuthenticationAttempt {
  const a = createAttempt();
  a.expire(nextEventId(), at(T1));
  return a;
}

function createCancelledAttempt(): AuthenticationAttempt {
  const a = createAttempt();
  a.cancel('user aborted', nextEventId(), at(T1));
  return a;
}

describe('AuthenticationAttempt Aggregate — Factory: start()', () => {
  it('creates an attempt with correct state', () => {
    const id = validAttemptId();
    const userId = validUserId();
    const a = AuthenticationAttempt.start(id, userId, nextEventId(), at(T0));

    expect(a.id).toBe(id);
    expect(a.userId).toBe(userId);
  });

  it('accepts null userId (anonymous attempt)', () => {
    const a = createAttempt({ userId: null });
    expect(a.userId).toBeNull();
  });

  it('initializes with non-terminal state', () => {
    const a = createAttempt();
    expect(a.succeeded).toBe(false);
    expect(a.failed).toBe(false);
    expect(a.expired).toBe(false);
    expect(a.cancelled).toBe(false);
    expect(a.isTerminal).toBe(false);
  });

  it('initializes with no method, no MFA', () => {
    const a = createAttempt();
    expect(a.method).toBeNull();
    expect(a.mfaRequired).toBe(false);
    expect(a.mfaChallengeBegun).toBe(false);
    expect(a.mfaChallengeCompleted).toBe(false);
  });

  it('initializes timestamps correctly', () => {
    const a = createAttempt();
    expect(a.startedAt).toEqual(at(T0));
    expect(a.completedAt).toBeNull();
  });

  it('emits AuthenticationAttemptRecorded event with correct payload', () => {
    const id = validAttemptId();
    const userId = validUserId();
    const eventId = nextEventId();
    const a = AuthenticationAttempt.start(id, userId, eventId, at(T0));

    const events = a.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as AuthenticationAttemptRecorded;
    expect(event).toBeInstanceOf(AuthenticationAttemptRecorded);
    expect(event.eventType).toBe('identity.authentication_attempt.recorded');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateId).toBe(id.toString());
    expect(event.aggregateType).toBe('AuthenticationAttempt');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.attemptId).toBe(id);
    expect(event.userId).toBe(userId);
    expect(event.startedAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const a = createAttempt();
    expect(a.version).toBe(1);
  });
});

describe('AuthenticationAttempt Aggregate — recordMethod()', () => {
  it('records the authentication method', () => {
    const a = createAttempt();
    const method = passkeyMethod();
    a.recordMethod(method, nextEventId(), at(T1));
    expect(a.method).toBe(method);
  });

  it('emits AuthenticationAttemptMethodRecorded event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.recordMethod(passwordMethod(), eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationAttemptMethodRecorded;
    expect(event).toBeInstanceOf(AuthenticationAttemptMethodRecorded);
    expect(event.eventType).toBe('identity.authentication_attempt.method.recorded');
    expect(event.eventId).toBe(eventId);
    expect(event.aggregateVersion).toBe(2);
    expect(event.method.toString()).toBe('password');
  });

  it('throws when method already recorded', () => {
    const a = createAttemptWithMethod();
    expect(() => {
      a.recordMethod(passkeyMethod(), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when attempt is terminal (succeeded)', () => {
    const a = createSucceededAttempt();
    expect(() => {
      a.recordMethod(passwordMethod(), nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });

  it('throws when attempt is terminal (failed)', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.recordMethod(passwordMethod(), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordMfaRequirement()', () => {
  it('marks MFA as required with factor', () => {
    const a = createAttemptWithMethod();
    a.recordMfaRequirement(totpFactor(), nextEventId(), at(T2));
    expect(a.mfaRequired).toBe(true);
    expect(a.mfaFactor?.toString()).toBe('possession');
  });

  it('emits AuthenticationAttemptMfaRequired event', () => {
    const a = createAttemptWithMethod();
    const eventId = nextEventId();
    a.recordMfaRequirement(totpFactor(), eventId, at(T2));

    const events = a.getUncommittedEvents();
    const event = events[2] as AuthenticationAttemptMfaRequired;
    expect(event).toBeInstanceOf(AuthenticationAttemptMfaRequired);
    expect(event.eventType).toBe('identity.authentication_attempt.mfa.required');
    expect(event.aggregateVersion).toBe(3);
    expect(event.factor.toString()).toBe('possession');
  });

  it('throws when MFA already required', () => {
    const a = createAttemptWithMfaRequired();
    expect(() => {
      a.recordMfaRequirement(totpFactor(), nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.recordMfaRequirement(totpFactor(), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — beginMfaChallenge()', () => {
  it('begins the MFA challenge', () => {
    const a = createAttemptWithMfaRequired();
    a.beginMfaChallenge(nextEventId(), at(T3));
    expect(a.mfaChallengeBegun).toBe(true);
  });

  it('emits AuthenticationAttemptMfaChallengeBegun event', () => {
    const a = createAttemptWithMfaRequired();
    const eventId = nextEventId();
    a.beginMfaChallenge(eventId, at(T3));

    const events = a.getUncommittedEvents();
    const event = events[3] as AuthenticationAttemptMfaChallengeBegun;
    expect(event).toBeInstanceOf(AuthenticationAttemptMfaChallengeBegun);
    expect(event.eventType).toBe('identity.authentication_attempt.mfa.challenge.begun');
    expect(event.begunAt).toEqual(at(T3));
  });

  it('throws when MFA not required', () => {
    const a = createAttemptWithMethod();
    expect(() => {
      a.beginMfaChallenge(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when challenge already begun', () => {
    const a = createAttemptWithMfaBegun();
    expect(() => {
      a.beginMfaChallenge(nextEventId(), at(T4));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.beginMfaChallenge(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — completeMfaChallenge()', () => {
  it('completes the MFA challenge', () => {
    const a = createAttemptWithMfaBegun();
    a.completeMfaChallenge(nextEventId(), at(T4));
    expect(a.mfaChallengeCompleted).toBe(true);
  });

  it('emits AuthenticationAttemptMfaChallengeCompleted event', () => {
    const a = createAttemptWithMfaBegun();
    const eventId = nextEventId();
    a.completeMfaChallenge(eventId, at(T4));

    const events = a.getUncommittedEvents();
    const event = events[4] as AuthenticationAttemptMfaChallengeCompleted;
    expect(event).toBeInstanceOf(AuthenticationAttemptMfaChallengeCompleted);
    expect(event.eventType).toBe('identity.authentication_attempt.mfa.challenge.completed');
    expect(event.completedAt).toEqual(at(T4));
  });

  it('throws when challenge not begun', () => {
    const a = createAttemptWithMfaRequired();
    expect(() => {
      a.completeMfaChallenge(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when challenge already completed', () => {
    const a = createAttemptWithMfaCompleted();
    expect(() => {
      a.completeMfaChallenge(nextEventId(), at(T5));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.completeMfaChallenge(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — failMfa()', () => {
  it('records MFA failure with reason', () => {
    const a = createAttemptWithMfaBegun();
    a.failMfa('wrong code', nextEventId(), at(T4));
    expect(a.mfaChallengeBegun).toBe(false);
  });

  it('emits AuthenticationAttemptMfaFailed event', () => {
    const a = createAttemptWithMfaBegun();
    const eventId = nextEventId();
    a.failMfa('wrong code', eventId, at(T4));

    const events = a.getUncommittedEvents();
    const event = events[4] as AuthenticationAttemptMfaFailed;
    expect(event).toBeInstanceOf(AuthenticationAttemptMfaFailed);
    expect(event.eventType).toBe('identity.authentication_attempt.mfa.failed');
    expect(event.reason).toBe('wrong code');
    expect(event.failedAt).toEqual(at(T4));
  });

  it('throws when challenge not begun', () => {
    const a = createAttemptWithMfaRequired();
    expect(() => {
      a.failMfa('wrong code', nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when reason is empty', () => {
    const a = createAttemptWithMfaBegun();
    expect(() => {
      a.failMfa('  ', nextEventId(), at(T4));
    }).toThrow(InvariantViolationError);
  });

  it('throws when challenge already completed', () => {
    const a = createAttemptWithMfaCompleted();
    expect(() => {
      a.failMfa('wrong code', nextEventId(), at(T5));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.failMfa('wrong', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordSuccess()', () => {
  it('marks attempt as succeeded without MFA', () => {
    const a = createAttemptWithMethod();
    a.recordSuccess(nextEventId(), at(T2));
    expect(a.succeeded).toBe(true);
    expect(a.isTerminal).toBe(true);
  });

  it('marks attempt as succeeded after MFA completed', () => {
    const a = createAttemptWithMfaCompleted();
    a.recordSuccess(nextEventId(), at(T5));
    expect(a.succeeded).toBe(true);
  });

  it('emits AuthenticationSucceeded event', () => {
    const a = createAttemptWithMethod();
    const eventId = nextEventId();
    a.recordSuccess(eventId, at(T2));

    const events = a.getUncommittedEvents();
    const event = events[2] as AuthenticationSucceeded;
    expect(event).toBeInstanceOf(AuthenticationSucceeded);
    expect(event.eventType).toBe('identity.authentication.succeeded');
    expect(event.aggregateVersion).toBe(3);
    expect(event.succeededAt).toEqual(at(T2));
  });

  it('sets completedAt', () => {
    const a = createAttemptWithMethod();
    a.recordSuccess(nextEventId(), at(T2));
    expect(a.completedAt).toEqual(at(T2));
  });

  it('throws when MFA required but not completed', () => {
    const a = createAttemptWithMfaRequired();
    expect(() => {
      a.recordSuccess(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when MFA challenge begun but not completed', () => {
    const a = createAttemptWithMfaBegun();
    expect(() => {
      a.recordSuccess(nextEventId(), at(T4));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already succeeded', () => {
    const a = createSucceededAttempt();
    expect(() => {
      a.recordSuccess(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already failed', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.recordSuccess(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordFailure()', () => {
  it('marks attempt as failed with reason', () => {
    const a = createAttempt();
    a.recordFailure('invalid password', nextEventId(), at(T1));
    expect(a.failed).toBe(true);
    expect(a.failureReason).toBe('invalid password');
    expect(a.isTerminal).toBe(true);
  });

  it('emits AuthenticationFailed event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.recordFailure('invalid password', eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationFailed;
    expect(event).toBeInstanceOf(AuthenticationFailed);
    expect(event.eventType).toBe('identity.authentication.failed');
    expect(event.failureReason).toBe('invalid password');
    expect(event.failedAt).toEqual(at(T1));
  });

  it('sets completedAt', () => {
    const a = createAttempt();
    a.recordFailure('bad', nextEventId(), at(T1));
    expect(a.completedAt).toEqual(at(T1));
  });

  it('throws when reason is empty', () => {
    const a = createAttempt();
    expect(() => {
      a.recordFailure('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already succeeded', () => {
    const a = createSucceededAttempt();
    expect(() => {
      a.recordFailure('bad', nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordLockoutTrigger()', () => {
  it('records lockout trigger', () => {
    const a = createFailedAttempt();
    expect(a.lockoutTriggered).toBe(false);
  });

  it('emits AuthenticationAttemptLockoutTriggered event on non-terminal attempt', () => {
    const a = createAttemptWithMethod();
    const eventId = nextEventId();
    a.recordLockoutTrigger(eventId, at(T2));

    const events = a.getUncommittedEvents();
    const event = events[2] as AuthenticationAttemptLockoutTriggered;
    expect(event).toBeInstanceOf(AuthenticationAttemptLockoutTriggered);
    expect(event.eventType).toBe('identity.authentication_attempt.lockout.triggered');
    expect(event.triggeredAt).toEqual(at(T2));
  });

  it('throws when lockout already triggered', () => {
    const a = createAttemptWithMethod();
    a.recordLockoutTrigger(nextEventId(), at(T2));
    expect(() => {
      a.recordLockoutTrigger(nextEventId(), at(T3));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.recordLockoutTrigger(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordThrottleTrigger()', () => {
  it('records throttle trigger', () => {
    const a = createAttempt();
    a.recordThrottleTrigger(nextEventId(), at(T1));
    expect(a.throttleTriggered).toBe(true);
  });

  it('emits AuthenticationAttemptThrottleTriggered event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.recordThrottleTrigger(eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationAttemptThrottleTriggered;
    expect(event).toBeInstanceOf(AuthenticationAttemptThrottleTriggered);
    expect(event.eventType).toBe('identity.authentication_attempt.throttle.triggered');
  });

  it('throws when throttle already triggered', () => {
    const a = createAttempt();
    a.recordThrottleTrigger(nextEventId(), at(T1));
    expect(() => {
      a.recordThrottleTrigger(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createExpiredAttempt();
    expect(() => {
      a.recordThrottleTrigger(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — recordRiskScore()', () => {
  it('records risk score', () => {
    const a = createAttempt();
    a.recordRiskScore(42, nextEventId(), at(T1));
    expect(a.riskScore).toBe(42);
  });

  it('emits AuthenticationAttemptRiskScoreRecorded event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.recordRiskScore(75, eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationAttemptRiskScoreRecorded;
    expect(event).toBeInstanceOf(AuthenticationAttemptRiskScoreRecorded);
    expect(event.eventType).toBe('identity.authentication_attempt.risk_score.recorded');
    expect(event.riskScore).toBe(75);
  });

  it('allows updating risk score multiple times', () => {
    const a = createAttempt();
    a.recordRiskScore(30, nextEventId(), at(T1));
    a.recordRiskScore(90, nextEventId(), at(T2));
    expect(a.riskScore).toBe(90);
  });

  it('accepts boundary values 0 and 100', () => {
    const a = createAttempt();
    a.recordRiskScore(0, nextEventId(), at(T1));
    expect(a.riskScore).toBe(0);
    a.recordRiskScore(100, nextEventId(), at(T2));
    expect(a.riskScore).toBe(100);
  });

  it('throws when score is negative', () => {
    const a = createAttempt();
    expect(() => {
      a.recordRiskScore(-1, nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when score exceeds 100', () => {
    const a = createAttempt();
    expect(() => {
      a.recordRiskScore(101, nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when terminal', () => {
    const a = createFailedAttempt();
    expect(() => {
      a.recordRiskScore(50, nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — expire()', () => {
  it('marks attempt as expired', () => {
    const a = createAttempt();
    a.expire(nextEventId(), at(T1));
    expect(a.expired).toBe(true);
    expect(a.isTerminal).toBe(true);
  });

  it('emits AuthenticationAttemptExpired event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.expire(eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationAttemptExpired;
    expect(event).toBeInstanceOf(AuthenticationAttemptExpired);
    expect(event.eventType).toBe('identity.authentication_attempt.expired');
    expect(event.expiredAt).toEqual(at(T1));
  });

  it('sets completedAt', () => {
    const a = createAttempt();
    a.expire(nextEventId(), at(T1));
    expect(a.completedAt).toEqual(at(T1));
  });

  it('throws when already expired', () => {
    const a = createExpiredAttempt();
    expect(() => {
      a.expire(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when succeeded', () => {
    const a = createSucceededAttempt();
    expect(() => {
      a.expire(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — cancel()', () => {
  it('marks attempt as cancelled with reason', () => {
    const a = createAttempt();
    a.cancel('user aborted', nextEventId(), at(T1));
    expect(a.cancelled).toBe(true);
    expect(a.cancelReason).toBe('user aborted');
    expect(a.isTerminal).toBe(true);
  });

  it('emits AuthenticationAttemptCancelled event', () => {
    const a = createAttempt();
    const eventId = nextEventId();
    a.cancel('aborted', eventId, at(T1));

    const events = a.getUncommittedEvents();
    const event = events[1] as AuthenticationAttemptCancelled;
    expect(event).toBeInstanceOf(AuthenticationAttemptCancelled);
    expect(event.eventType).toBe('identity.authentication_attempt.cancelled');
    expect(event.reason).toBe('aborted');
    expect(event.cancelledAt).toEqual(at(T1));
  });

  it('trims reason', () => {
    const a = createAttempt();
    a.cancel('  aborted  ', nextEventId(), at(T1));
    expect(a.cancelReason).toBe('aborted');
  });

  it('throws when reason is empty', () => {
    const a = createAttempt();
    expect(() => {
      a.cancel('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already cancelled', () => {
    const a = createCancelledAttempt();
    expect(() => {
      a.cancel('again', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when already succeeded', () => {
    const a = createSucceededAttempt();
    expect(() => {
      a.cancel('abort', nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });
});

describe('AuthenticationAttempt Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createAttemptWithMfaCompleted();
    original.recordSuccess(nextEventId(), at(T5));

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.userId?.toString()).toBe(original.userId?.toString());
    expect(rebuilt.method?.toString()).toBe(original.method?.toString());
    expect(rebuilt.mfaRequired).toBe(true);
    expect(rebuilt.mfaChallengeBegun).toBe(true);
    expect(rebuilt.mfaChallengeCompleted).toBe(true);
    expect(rebuilt.succeeded).toBe(true);
  });

  it('rebuilds failed state from history', () => {
    const original = createAttempt();
    original.recordFailure('bad', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.failed).toBe(true);
    expect(rebuilt.failureReason).toBe('bad');
  });

  it('rebuilds expired state from history', () => {
    const original = createExpiredAttempt();

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.expired).toBe(true);
  });

  it('rebuilds cancelled state from history', () => {
    const original = createCancelledAttempt();

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.cancelled).toBe(true);
    expect(rebuilt.cancelReason).toBe('user aborted');
  });

  it('rebuilds risk score from history', () => {
    const original = createAttempt();
    original.recordRiskScore(42, nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.riskScore).toBe(42);
  });

  it('rebuilds lockout/throttle from history', () => {
    const original = createAttempt();
    original.recordLockoutTrigger(nextEventId(), at(T1));
    original.recordThrottleTrigger(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.lockoutTriggered).toBe(true);
    expect(rebuilt.throttleTriggered).toBe(true);
  });

  it('rebuilds MFA failed state from history (challenge resets)', () => {
    const original = createAttemptWithMfaBegun();
    original.failMfa('wrong', nextEventId(), at(T4));

    const history = original.getUncommittedEvents();
    const rebuilt = AuthenticationAttempt.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.mfaChallengeBegun).toBe(false);
    expect(rebuilt.mfaRequired).toBe(true);
  });

  it('produces identical state across multiple replays', () => {
    const original = createAttemptWithMfaCompleted();

    const history = original.getUncommittedEvents();
    const first = AuthenticationAttempt.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = AuthenticationAttempt.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.succeeded).toBe(second.succeeded);
    expect(first.mfaChallengeCompleted).toBe(second.mfaChallengeCompleted);
  });
});

describe('AuthenticationAttempt Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createAttemptWithMfaCompleted();
    original.recordRiskScore(50, nextEventId(), at(T4));
    original.recordSuccess(nextEventId(), at(T5));

    const snapshot = original.toSnapshot();
    const restored = AuthenticationAttempt.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.userId?.toString()).toBe(original.userId?.toString());
    expect(restored.method?.toString()).toBe(original.method?.toString());
    expect(restored.mfaRequired).toBe(original.mfaRequired);
    expect(restored.mfaFactor?.toString()).toBe(original.mfaFactor?.toString());
    expect(restored.mfaChallengeBegun).toBe(original.mfaChallengeBegun);
    expect(restored.mfaChallengeCompleted).toBe(original.mfaChallengeCompleted);
    expect(restored.succeeded).toBe(original.succeeded);
    expect(restored.riskScore).toBe(original.riskScore);
    expect(restored.startedAt.toISOString()).toBe(original.startedAt.toISOString());
    expect(restored.completedAt?.toISOString()).toBe(original.completedAt?.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes failed state correctly', () => {
    const original = createFailedAttempt();

    const snapshot = original.toSnapshot();
    const restored = AuthenticationAttempt.fromSnapshot(snapshot);

    expect(restored.failed).toBe(true);
    expect(restored.failureReason).toBe('bad password');
  });

  it('serializes null userId correctly', () => {
    const original = createAttempt({ userId: null });

    const snapshot = original.toSnapshot();
    const restored = AuthenticationAttempt.fromSnapshot(snapshot);

    expect(restored.userId).toBeNull();
  });

  it('serializes lockout/throttle state correctly', () => {
    const original = createAttempt();
    original.recordLockoutTrigger(nextEventId(), at(T1));
    original.recordThrottleTrigger(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = AuthenticationAttempt.fromSnapshot(snapshot);

    expect(restored.lockoutTriggered).toBe(true);
    expect(restored.throttleTriggered).toBe(true);
  });

  it('restores version from snapshot', () => {
    const original = createAttemptWithMfaCompleted();
    const snapshot = original.toSnapshot();
    const restored = AuthenticationAttempt.fromSnapshot(snapshot);
    expect(restored.version).toBe(5);
  });
});

describe('AuthenticationAttempt Aggregate — Equality', () => {
  it('two attempts with same id are equal', () => {
    const id = validAttemptId();
    const a = AuthenticationAttempt.start(id, validUserId(), nextEventId(), at(T0));
    const b = AuthenticationAttempt.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two attempts with different ids are not equal', () => {
    const a = createAttempt();
    const b = createAttempt();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const a = createAttempt();
    expect(a.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const a = createAttempt();
    expect(a.equals(undefined)).toBe(false);
  });
});

describe('AuthenticationAttempt Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const a = createAttemptWithMethod();
    expect(a.getUncommittedEvents()).toHaveLength(2);

    a.markEventsAsCommitted();
    expect(a.getUncommittedEvents()).toHaveLength(0);
    expect(a.version).toBe(2);
  });
});

describe('AuthenticationAttempt Aggregate — Full lifecycle integration', () => {
  it('supports full MFA lifecycle: start → method → mfaRequired → begin → complete → succeed', () => {
    const a = createAttempt();

    a.recordMethod(passwordMethod(), nextEventId(), at(T1));
    a.recordMfaRequirement(totpFactor(), nextEventId(), at(T2));
    a.beginMfaChallenge(nextEventId(), at(T3));
    a.completeMfaChallenge(nextEventId(), at(T4));
    a.recordSuccess(nextEventId(), at(T5));

    expect(a.succeeded).toBe(true);
    expect(a.completedAt).toEqual(at(T5));
    expect(a.version).toBe(6);
    expect(a.getUncommittedEvents()).toHaveLength(6);
  });

  it('supports no-MFA success: start → method → succeed', () => {
    const a = createAttempt();
    a.recordMethod(passkeyMethod(), nextEventId(), at(T1));
    a.recordSuccess(nextEventId(), at(T2));

    expect(a.succeeded).toBe(true);
    expect(a.version).toBe(3);
  });

  it('supports MFA retry: begin → fail → begin again → complete', () => {
    const a = createAttemptWithMfaRequired();
    a.beginMfaChallenge(nextEventId(), at(T3));
    a.failMfa('wrong code', nextEventId(), at(T4));
    expect(a.mfaChallengeBegun).toBe(false);

    a.beginMfaChallenge(nextEventId(), at(T5));
    a.completeMfaChallenge(nextEventId(), at(T6));
    a.recordSuccess(nextEventId(), at(T7));

    expect(a.succeeded).toBe(true);
    expect(a.mfaChallengeCompleted).toBe(true);
  });

  it('supports lockout after MFA failure', () => {
    const a = createAttemptWithMfaBegun();
    a.failMfa('wrong code', nextEventId(), at(T4));
    a.recordLockoutTrigger(nextEventId(), at(T5));
    a.recordFailure('locked out', nextEventId(), at(T6));

    expect(a.failed).toBe(true);
    expect(a.lockoutTriggered).toBe(true);
    expect(a.failureReason).toBe('locked out');
  });

  it('supports throttle then expire', () => {
    const a = createAttempt();
    a.recordThrottleTrigger(nextEventId(), at(T1));
    a.expire(nextEventId(), at(T2));

    expect(a.expired).toBe(true);
    expect(a.throttleTriggered).toBe(true);
  });

  it('all operations after success throw', () => {
    const a = createSucceededAttempt();

    expect(() => {
      a.recordMethod(passwordMethod(), nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordMfaRequirement(totpFactor(), nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.beginMfaChallenge(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.completeMfaChallenge(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.failMfa('x', nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordSuccess(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordFailure('x', nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordLockoutTrigger(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordThrottleTrigger(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.recordRiskScore(50, nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.expire(nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
    expect(() => {
      a.cancel('x', nextEventId(), at(T6));
    }).toThrow(InvariantViolationError);
  });
});
