import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  PasswordResetInitiated,
  PasswordResetCompleted,
  PasswordResetExpired,
  PasswordResetCancelled,
} from '../../events/password-reset-events';
import { PasswordResetId, UserId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export const MAX_RESEND_COUNT = 5;

export interface PasswordResetSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly completed: boolean;
  readonly expired: boolean;
  readonly cancelled: boolean;
  readonly expiresAt: string;
  readonly resendCount: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly expiredAt: string | null;
  readonly cancelledAt: string | null;
  readonly version: number;
}

export class PasswordReset extends AggregateRoot<PasswordResetId> {
  readonly aggregateType = 'PasswordReset';

  private _userId!: UserId;
  private _token!: string;
  private _completed = false;
  private _expired = false;
  private _cancelled = false;
  private _expiresAt!: Date;
  private _resendCount = 0;
  private _createdAt!: Date;
  private _completedAt: Date | null = null;
  private _expiredAt: Date | null = null;
  private _cancelledAt: Date | null = null;

  private constructor(id: PasswordResetId) {
    super(id);
  }

  static create(
    id: PasswordResetId,
    userId: UserId,
    token: string,
    expiresAt: Date,
    eventId: EventId,
    occurredAt: Date,
  ): PasswordReset {
    if (!token.trim()) {
      throw new InvariantViolationError(
        'PasswordReset',
        id.toString(),
        'password-reset-token-empty',
        {},
      );
    }
    if (expiresAt <= occurredAt) {
      throw new InvariantViolationError(
        'PasswordReset',
        id.toString(),
        'password-reset-expires-at-past',
        { expiresAt: expiresAt.toISOString(), occurredAt: occurredAt.toISOString() },
      );
    }
    const pr = new PasswordReset(id);
    pr.apply(
      new PasswordResetInitiated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: pr.aggregateType,
          aggregateVersion: pr.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        token.trim(),
        expiresAt,
        0,
        occurredAt,
      ),
    );
    return pr;
  }

  static fromSnapshot(snapshot: PasswordResetSnapshot): PasswordReset {
    const pr = new PasswordReset(new PasswordResetId(snapshot.id));
    pr._userId = new UserId(snapshot.userId);
    pr._token = snapshot.token;
    pr._completed = snapshot.completed;
    pr._expired = snapshot.expired;
    pr._cancelled = snapshot.cancelled;
    pr._expiresAt = new Date(snapshot.expiresAt);
    pr._resendCount = snapshot.resendCount;
    pr._createdAt = new Date(snapshot.createdAt);
    pr._completedAt = snapshot.completedAt ? new Date(snapshot.completedAt) : null;
    pr._expiredAt = snapshot.expiredAt ? new Date(snapshot.expiredAt) : null;
    pr._cancelledAt = snapshot.cancelledAt ? new Date(snapshot.cancelledAt) : null;
    pr.restoreVersion(snapshot.version);
    return pr;
  }

  static reconstitute(id: PasswordResetId): PasswordReset {
    return new PasswordReset(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get token(): string {
    return this._token;
  }

  get completed(): boolean {
    return this._completed;
  }

  get expired(): boolean {
    return this._expired;
  }

  get cancelled(): boolean {
    return this._cancelled;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get resendCount(): number {
    return this._resendCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get expiredAt(): Date | null {
    return this._expiredAt;
  }

  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }

  get pending(): boolean {
    return !this._completed && !this._expired && !this._cancelled;
  }

  resend(token: string, expiresAt: Date, eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    if (!token.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-token-empty',
        {},
      );
    }
    if (expiresAt <= occurredAt) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-expires-at-past',
        { expiresAt: expiresAt.toISOString(), occurredAt: occurredAt.toISOString() },
      );
    }
    if (this._resendCount >= MAX_RESEND_COUNT) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-max-resends-reached',
        { resendCount: this._resendCount, maxResendCount: MAX_RESEND_COUNT },
      );
    }
    this.apply(
      new PasswordResetInitiated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        token.trim(),
        expiresAt,
        this._resendCount + 1,
        occurredAt,
      ),
    );
  }

  complete(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new PasswordResetCompleted(
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

  expire(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new PasswordResetExpired(
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

  cancel(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new PasswordResetCancelled(
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

  toSnapshot(): PasswordResetSnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      token: this._token,
      completed: this._completed,
      expired: this._expired,
      cancelled: this._cancelled,
      expiresAt: this._expiresAt.toISOString(),
      resendCount: this._resendCount,
      createdAt: this._createdAt.toISOString(),
      completedAt: this._completedAt?.toISOString() ?? null,
      expiredAt: this._expiredAt?.toISOString() ?? null,
      cancelledAt: this._cancelledAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof PasswordResetInitiated) {
      this._userId = event.userId;
      this._token = event.token;
      this._expiresAt = event.expiresAt;
      this._resendCount = event.resendCount;
      if (this.version === 0) {
        this._createdAt = event.initiatedAt;
      }
    } else if (event instanceof PasswordResetCompleted) {
      this._completed = true;
      this._completedAt = event.completedAt;
    } else if (event instanceof PasswordResetExpired) {
      this._expired = true;
      this._expiredAt = event.expiredAt;
    } else if (event instanceof PasswordResetCancelled) {
      this._cancelled = true;
      this._cancelledAt = event.cancelledAt;
    }
  }

  private requirePending(): void {
    if (this._completed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-already-completed',
        {},
      );
    }
    if (this._expired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-already-expired',
        {},
      );
    }
    if (this._cancelled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'password-reset-already-cancelled',
        {},
      );
    }
  }
}
