import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

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

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface AuthenticationAttemptSnapshot {
  readonly id: string;
  readonly userId: string | null;
  readonly method: string | null;
  readonly mfaRequired: boolean;
  readonly mfaFactor: string | null;
  readonly mfaChallengeBegun: boolean;
  readonly mfaChallengeCompleted: boolean;
  readonly succeeded: boolean;
  readonly failed: boolean;
  readonly failureReason: string | null;
  readonly lockoutTriggered: boolean;
  readonly throttleTriggered: boolean;
  readonly riskScore: number | null;
  readonly expired: boolean;
  readonly cancelled: boolean;
  readonly cancelReason: string | null;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly version: number;
}

export class AuthenticationAttempt extends AggregateRoot<AttemptId> {
  readonly aggregateType = 'AuthenticationAttempt';

  private _userId: UserId | null = null;
  private _method: AuthenticationMethod | null = null;
  private _mfaRequired = false;
  private _mfaFactor: AuthenticationFactor | null = null;
  private _mfaChallengeBegun = false;
  private _mfaChallengeCompleted = false;
  private _succeeded = false;
  private _failed = false;
  private _failureReason: string | null = null;
  private _lockoutTriggered = false;
  private _throttleTriggered = false;
  private _riskScore: number | null = null;
  private _expired = false;
  private _cancelled = false;
  private _cancelReason: string | null = null;
  private _startedAt!: Date;
  private _completedAt: Date | null = null;

  private constructor(id: AttemptId) {
    super(id);
  }

  static start(
    id: AttemptId,
    userId: UserId | null,
    eventId: EventId,
    occurredAt: Date,
  ): AuthenticationAttempt {
    const attempt = new AuthenticationAttempt(id);
    attempt.apply(
      new AuthenticationAttemptRecorded(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: attempt.aggregateType,
          aggregateVersion: attempt.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        occurredAt,
      ),
    );
    return attempt;
  }

  static fromSnapshot(snapshot: AuthenticationAttemptSnapshot): AuthenticationAttempt {
    const attempt = new AuthenticationAttempt(new AttemptId(snapshot.id));
    attempt._userId = snapshot.userId ? new UserId(snapshot.userId) : null;
    attempt._method = snapshot.method ? new AuthenticationMethod(snapshot.method) : null;
    attempt._mfaRequired = snapshot.mfaRequired;
    attempt._mfaFactor = snapshot.mfaFactor ? new AuthenticationFactor(snapshot.mfaFactor) : null;
    attempt._mfaChallengeBegun = snapshot.mfaChallengeBegun;
    attempt._mfaChallengeCompleted = snapshot.mfaChallengeCompleted;
    attempt._succeeded = snapshot.succeeded;
    attempt._failed = snapshot.failed;
    attempt._failureReason = snapshot.failureReason;
    attempt._lockoutTriggered = snapshot.lockoutTriggered;
    attempt._throttleTriggered = snapshot.throttleTriggered;
    attempt._riskScore = snapshot.riskScore;
    attempt._expired = snapshot.expired;
    attempt._cancelled = snapshot.cancelled;
    attempt._cancelReason = snapshot.cancelReason;
    attempt._startedAt = new Date(snapshot.startedAt);
    attempt._completedAt = snapshot.completedAt ? new Date(snapshot.completedAt) : null;
    attempt.restoreVersion(snapshot.version);
    return attempt;
  }

  static reconstitute(id: AttemptId): AuthenticationAttempt {
    return new AuthenticationAttempt(id);
  }

  get userId(): UserId | null {
    return this._userId;
  }

  get method(): AuthenticationMethod | null {
    return this._method;
  }

  get mfaRequired(): boolean {
    return this._mfaRequired;
  }

  get mfaFactor(): AuthenticationFactor | null {
    return this._mfaFactor;
  }

  get mfaChallengeBegun(): boolean {
    return this._mfaChallengeBegun;
  }

  get mfaChallengeCompleted(): boolean {
    return this._mfaChallengeCompleted;
  }

  get succeeded(): boolean {
    return this._succeeded;
  }

  get failed(): boolean {
    return this._failed;
  }

  get failureReason(): string | null {
    return this._failureReason;
  }

  get lockoutTriggered(): boolean {
    return this._lockoutTriggered;
  }

  get throttleTriggered(): boolean {
    return this._throttleTriggered;
  }

  get riskScore(): number | null {
    return this._riskScore;
  }

  get expired(): boolean {
    return this._expired;
  }

  get cancelled(): boolean {
    return this._cancelled;
  }

  get cancelReason(): string | null {
    return this._cancelReason;
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get isTerminal(): boolean {
    return this._succeeded || this._failed || this._expired || this._cancelled;
  }

  recordMethod(method: AuthenticationMethod, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (this._method !== null) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-method-already-recorded',
        { currentMethod: this._method.toString() },
      );
    }
    this.apply(
      new AuthenticationAttemptMethodRecorded(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        method,
      ),
    );
  }

  recordMfaRequirement(factor: AuthenticationFactor, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (this._mfaRequired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-already-required',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptMfaRequired(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        factor,
      ),
    );
  }

  beginMfaChallenge(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (!this._mfaRequired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-not-required',
        {},
      );
    }
    if (this._mfaChallengeBegun) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-challenge-already-begun',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptMfaChallengeBegun(
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

  completeMfaChallenge(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (!this._mfaChallengeBegun) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-challenge-not-begun',
        {},
      );
    }
    if (this._mfaChallengeCompleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-challenge-already-completed',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptMfaChallengeCompleted(
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

  failMfa(reason: string, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (!this._mfaChallengeBegun) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-challenge-not-begun',
        {},
      );
    }
    if (this._mfaChallengeCompleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-challenge-already-completed',
        {},
      );
    }
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-fail-reason-required',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptMfaFailed(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        reason.trim(),
        occurredAt,
      ),
    );
  }

  recordSuccess(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (this._mfaRequired && !this._mfaChallengeCompleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-mfa-not-completed',
        {},
      );
    }
    this.apply(
      new AuthenticationSucceeded(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._method,
        occurredAt,
      ),
    );
  }

  recordFailure(reason: string, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-failure-reason-required',
        {},
      );
    }
    this.apply(
      new AuthenticationFailed(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._method,
        reason.trim(),
        occurredAt,
      ),
    );
  }

  recordLockoutTrigger(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (this._lockoutTriggered) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-lockout-already-triggered',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptLockoutTriggered(
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

  recordThrottleTrigger(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (this._throttleTriggered) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-throttle-already-triggered',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptThrottleTriggered(
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

  recordRiskScore(score: number, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (score < 0 || score > 100) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-risk-score-out-of-range',
        { riskScore: score },
      );
    }
    this.apply(
      new AuthenticationAttemptRiskScoreRecorded(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        score,
      ),
    );
  }

  expire(eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    this.apply(
      new AuthenticationAttemptExpired(
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

  cancel(reason: string, eventId: EventId, occurredAt: Date): void {
    this.requireNonTerminal();
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-cancel-reason-required',
        {},
      );
    }
    this.apply(
      new AuthenticationAttemptCancelled(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        reason.trim(),
        occurredAt,
      ),
    );
  }

  toSnapshot(): AuthenticationAttemptSnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId?.toString() ?? null,
      method: this._method?.toString() ?? null,
      mfaRequired: this._mfaRequired,
      mfaFactor: this._mfaFactor?.toString() ?? null,
      mfaChallengeBegun: this._mfaChallengeBegun,
      mfaChallengeCompleted: this._mfaChallengeCompleted,
      succeeded: this._succeeded,
      failed: this._failed,
      failureReason: this._failureReason,
      lockoutTriggered: this._lockoutTriggered,
      throttleTriggered: this._throttleTriggered,
      riskScore: this._riskScore,
      expired: this._expired,
      cancelled: this._cancelled,
      cancelReason: this._cancelReason,
      startedAt: this._startedAt.toISOString(),
      completedAt: this._completedAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof AuthenticationAttemptRecorded) {
      this._userId = event.userId;
      this._startedAt = event.startedAt;
    } else if (event instanceof AuthenticationAttemptMethodRecorded) {
      this._method = event.method;
    } else if (event instanceof AuthenticationAttemptMfaRequired) {
      this._mfaRequired = true;
      this._mfaFactor = event.factor;
    } else if (event instanceof AuthenticationAttemptMfaChallengeBegun) {
      this._mfaChallengeBegun = true;
    } else if (event instanceof AuthenticationAttemptMfaChallengeCompleted) {
      this._mfaChallengeCompleted = true;
    } else if (event instanceof AuthenticationAttemptMfaFailed) {
      this._mfaChallengeBegun = false;
    } else if (event instanceof AuthenticationSucceeded) {
      this._succeeded = true;
      this._completedAt = event.succeededAt;
    } else if (event instanceof AuthenticationFailed) {
      this._failed = true;
      this._failureReason = event.failureReason;
      this._completedAt = event.failedAt;
    } else if (event instanceof AuthenticationAttemptLockoutTriggered) {
      this._lockoutTriggered = true;
    } else if (event instanceof AuthenticationAttemptThrottleTriggered) {
      this._throttleTriggered = true;
    } else if (event instanceof AuthenticationAttemptRiskScoreRecorded) {
      this._riskScore = event.riskScore;
    } else if (event instanceof AuthenticationAttemptExpired) {
      this._expired = true;
      this._completedAt = event.expiredAt;
    } else if (event instanceof AuthenticationAttemptCancelled) {
      this._cancelled = true;
      this._cancelReason = event.reason;
      this._completedAt = event.cancelledAt;
    }
  }

  private requireNonTerminal(): void {
    if (this._succeeded) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-already-succeeded',
        {},
      );
    }
    if (this._failed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-already-failed',
        {},
      );
    }
    if (this._expired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-already-expired',
        {},
      );
    }
    if (this._cancelled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'auth-attempt-already-cancelled',
        {},
      );
    }
  }
}
