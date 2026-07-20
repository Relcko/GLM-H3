import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  AuthenticationSucceededEvent,
  AuthenticationFailedEvent,
  AccountLockedEvent,
  LockoutResetEvent,
} from '../../events';

export interface AuthenticationAttemptState {
  id: EntityId;
  userId: string | null;
  identifier: string;
  method: string;
  success: boolean;
  failureReason: string | null;
  consecutiveFailures: number;
  lockedUntil: Date | null;
  attemptedAt: Date;
}

function initialState(id: EntityId): AuthenticationAttemptState {
  return {
    id,
    userId: null,
    identifier: '',
    method: '',
    success: false,
    failureReason: null,
    consecutiveFailures: 0,
    lockedUntil: null,
    attemptedAt: systemClock.now(),
  };
}

export class AuthenticationAttempt extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'AuthenticationAttempt';
  private state: AuthenticationAttemptState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static recordSuccess(params: {
    id?: EntityId;
    userId: string;
    method: string;
    identifier: string;
    previousConsecutiveFailures: number;
    clock?: Clock;
  }): AuthenticationAttempt {
    const attempt = new AuthenticationAttempt(params.id ?? generateId('aut'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    attempt.apply(new AuthenticationSucceededEvent(
      String(attempt.id), attempt.nextVersion(), occurredAt,
      params.userId, params.method,
    ));
    if (params.previousConsecutiveFailures > 0) {
      attempt.apply(new LockoutResetEvent(
        String(attempt.id), attempt.nextVersion(), occurredAt, params.userId,
      ));
    }
    return attempt;
  }

  static recordFailure(params: {
    id?: EntityId;
    userId: string | null;
    method: string;
    identifier: string;
    reason: string;
    previousConsecutiveFailures: number;
    maxAttempts: number;
    lockoutDurationMs: number;
    clock?: Clock;
  }): AuthenticationAttempt {
    const attempt = new AuthenticationAttempt(params.id ?? generateId('aut'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    const consecutiveFailures = params.previousConsecutiveFailures + 1;

    attempt.apply(new AuthenticationFailedEvent(
      String(attempt.id), attempt.nextVersion(), occurredAt,
      params.userId, params.method, params.reason, consecutiveFailures,
    ));

    if (consecutiveFailures >= params.maxAttempts && params.userId) {
      const lockedUntil = new Date(occurredAt.getTime() + params.lockoutDurationMs);
      attempt.apply(new AccountLockedEvent(
        String(attempt.id), attempt.nextVersion(), occurredAt,
        params.userId, lockedUntil.getTime(), consecutiveFailures,
      ));
    }

    return attempt;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): AuthenticationAttempt {
    const attempt = new AuthenticationAttempt(id);
    attempt.loadFromHistory(events);
    return attempt;
  }

  get userId(): string | null { return this.state.userId; }
  get identifier(): string { return this.state.identifier; }
  get method(): string { return this.state.method; }
  get success(): boolean { return this.state.success; }
  get failureReason(): string | null { return this.state.failureReason; }
  get consecutiveFailures(): number { return this.state.consecutiveFailures; }
  get lockedUntil(): Date | null { return this.state.lockedUntil; }
  get attemptedAt(): Date { return this.state.attemptedAt; }

  isLocked(clock?: Clock): boolean {
    if (!this.state.lockedUntil) return false;
    return (clock ?? systemClock).now() < this.state.lockedUntil;
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.auth_attempt.succeeded': {
        const e = event as AuthenticationSucceededEvent;
        this.state.userId = e.userId;
        this.state.method = e.method;
        this.state.success = true;
        this.state.consecutiveFailures = 0;
        this.state.attemptedAt = e.occurredAt;
        break;
      }
      case 'identity-access.auth_attempt.failed': {
        const e = event as AuthenticationFailedEvent;
        this.state.userId = e.userId;
        this.state.method = e.method;
        this.state.success = false;
        this.state.failureReason = e.reason;
        this.state.consecutiveFailures = e.consecutiveFailures;
        this.state.attemptedAt = e.occurredAt;
        break;
      }
      case 'identity-access.auth_attempt.account_locked': {
        const e = event as AccountLockedEvent;
        this.state.userId = e.userId;
        this.state.consecutiveFailures = e.consecutiveFailures;
        this.state.lockedUntil = new Date(e.lockedUntil);
        break;
      }
      case 'identity-access.auth_attempt.lockout_reset': {
        this.state.consecutiveFailures = 0;
        this.state.lockedUntil = null;
        break;
      }
    }
  }
}
