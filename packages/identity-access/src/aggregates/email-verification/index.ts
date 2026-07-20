import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  EmailVerificationRequestedEvent,
  EmailVerifiedEvent,
} from '../../events';

export enum VerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Expired = 'expired',
}

export interface EmailVerificationState {
  id: EntityId;
  userId: string;
  email: string;
  tokenHash: string;
  status: VerificationStatus;
  createdAt: Date;
  expiresAt: Date;
}

function initialState(id: EntityId): EmailVerificationState {
  const now = systemClock.now();
  return {
    id,
    userId: '',
    email: '',
    tokenHash: '',
    status: VerificationStatus.Pending,
    createdAt: now,
    expiresAt: now,
  };
}

export class EmailVerification extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'EmailVerification';
  private state: EmailVerificationState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static request(params: {
    id?: EntityId;
    userId: string;
    email: string;
    tokenHash: string;
    ttlMs: number;
    clock?: Clock;
  }): EmailVerification {
    const ev = new EmailVerification(params.id ?? generateId('ev'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    const expiresAt = occurredAt.getTime() + params.ttlMs;
    ev.apply(new EmailVerificationRequestedEvent(
      String(ev.id), ev.nextVersion(), occurredAt,
      params.userId, params.email, params.tokenHash, expiresAt,
    ));
    return ev;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): EmailVerification {
    const ev = new EmailVerification(id);
    ev.loadFromHistory(events);
    return ev;
  }

  get userId(): string { return this.state.userId; }
  get email(): string { return this.state.email; }
  get tokenHash(): string { return this.state.tokenHash; }
  get status(): VerificationStatus { return this.state.status; }
  get createdAt(): Date { return this.state.createdAt; }
  get expiresAt(): Date { return this.state.expiresAt; }

  isExpired(clock?: Clock): boolean {
    return (clock ?? systemClock).now() > this.state.expiresAt;
  }

  verify(userId: string, email: string, clock?: Clock): void {
    if (this.state.status !== VerificationStatus.Pending) {
      throw new InvariantViolationError('EmailVerification', String(this.id), 'already-processed');
    }
    const c = clock ?? systemClock;
    if (c.now() > this.state.expiresAt) {
      throw new InvariantViolationError('EmailVerification', String(this.id), 'expired');
    }
    const occurredAt = c.now();
    this.apply(new EmailVerifiedEvent(
      String(this.id), this.nextVersion(), occurredAt, userId, email,
    ));
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.email_verification.requested': {
        const e = event as EmailVerificationRequestedEvent;
        this.state.userId = e.userId;
        this.state.email = e.email;
        this.state.tokenHash = e.tokenHash;
        this.state.status = VerificationStatus.Pending;
        this.state.createdAt = e.occurredAt;
        this.state.expiresAt = new Date(e.expiresAt);
        break;
      }
      case 'identity-access.email_verification.verified': {
        this.state.status = VerificationStatus.Verified;
        break;
      }
    }
  }
}
