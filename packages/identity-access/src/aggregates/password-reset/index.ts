import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  PasswordResetRequestedEvent,
  PasswordResetCompletedEvent,
  PasswordResetExpiredEvent,
} from '../../events';

export enum PasswordResetStatus {
  Pending = 'pending',
  Completed = 'completed',
  Expired = 'expired',
}

export interface PasswordResetState {
  id: EntityId;
  userId: string;
  tokenHash: string;
  status: PasswordResetStatus;
  createdAt: Date;
  expiresAt: Date;
}

function initialState(id: EntityId): PasswordResetState {
  const now = systemClock.now();
  return {
    id,
    userId: '',
    tokenHash: '',
    status: PasswordResetStatus.Pending,
    createdAt: now,
    expiresAt: now,
  };
}

export class PasswordReset extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'PasswordReset';
  private state: PasswordResetState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static request(params: {
    id?: EntityId;
    userId: string;
    tokenHash: string;
    ttlMs: number;
    clock?: Clock;
  }): PasswordReset {
    const pr = new PasswordReset(params.id ?? generateId('pr'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    const expiresAt = occurredAt.getTime() + params.ttlMs;
    pr.apply(new PasswordResetRequestedEvent(
      String(pr.id), pr.nextVersion(), occurredAt,
      params.userId, params.tokenHash, expiresAt,
    ));
    return pr;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): PasswordReset {
    const pr = new PasswordReset(id);
    pr.loadFromHistory(events);
    return pr;
  }

  get userId(): string { return this.state.userId; }
  get tokenHash(): string { return this.state.tokenHash; }
  get status(): PasswordResetStatus { return this.state.status; }
  get createdAt(): Date { return this.state.createdAt; }
  get expiresAt(): Date { return this.state.expiresAt; }

  isExpired(clock?: Clock): boolean {
    return (clock ?? systemClock).now() > this.state.expiresAt;
  }

  complete(newPasswordHash: string, clock?: Clock): void {
    if (this.state.status !== PasswordResetStatus.Pending) {
      throw new InvariantViolationError('PasswordReset', String(this.id), 'already-processed');
    }
    const c = clock ?? systemClock;
    if (c.now() > this.state.expiresAt) {
      this.apply(new PasswordResetExpiredEvent(
        String(this.id), this.nextVersion(), c.now(), this.state.userId,
      ));
      throw new InvariantViolationError('PasswordReset', String(this.id), 'expired');
    }
    const occurredAt = c.now();
    this.apply(new PasswordResetCompletedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      this.state.userId, newPasswordHash,
    ));
  }

  markExpired(clock?: Clock): void {
    if (this.state.status !== PasswordResetStatus.Pending) return;
    const occurredAt = (clock ?? systemClock).now();
    this.apply(new PasswordResetExpiredEvent(
      String(this.id), this.nextVersion(), occurredAt, this.state.userId,
    ));
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.password_reset.requested': {
        const e = event as PasswordResetRequestedEvent;
        this.state.userId = e.userId;
        this.state.tokenHash = e.tokenHash;
        this.state.status = PasswordResetStatus.Pending;
        this.state.createdAt = e.occurredAt;
        this.state.expiresAt = new Date(e.expiresAt);
        break;
      }
      case 'identity-access.password_reset.completed': {
        this.state.status = PasswordResetStatus.Completed;
        break;
      }
      case 'identity-access.password_reset.expired': {
        this.state.status = PasswordResetStatus.Expired;
        break;
      }
    }
  }
}
