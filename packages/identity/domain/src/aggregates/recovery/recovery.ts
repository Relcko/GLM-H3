import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  RecoveryCancelled,
  RecoveryCompleted,
  RecoveryExpired,
  RecoveryRequested,
  RecoveryResent,
  RecoveryVerified,
} from '../../events/recovery-events';
import { RecoveryId, UserId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export const MAX_RESEND_COUNT = 5;

export interface RecoverySnapshot {
  readonly id: string;
  readonly userId: string;
  readonly verified: boolean;
  readonly completed: boolean;
  readonly expired: boolean;
  readonly cancelled: boolean;
  readonly resendCount: number;
  readonly createdAt: string;
  readonly verifiedAt: string | null;
  readonly completedAt: string | null;
  readonly expiredAt: string | null;
  readonly cancelledAt: string | null;
  readonly version: number;
}

export class Recovery extends AggregateRoot<RecoveryId> {
  readonly aggregateType = 'Recovery';

  private _userId!: UserId;
  private _verified = false;
  private _completed = false;
  private _expired = false;
  private _cancelled = false;
  private _resendCount = 0;
  private _createdAt!: Date;
  private _verifiedAt: Date | null = null;
  private _completedAt: Date | null = null;
  private _expiredAt: Date | null = null;
  private _cancelledAt: Date | null = null;

  private constructor(id: RecoveryId) {
    super(id);
  }

  static create(id: RecoveryId, userId: UserId, eventId: EventId, occurredAt: Date): Recovery {
    const r = new Recovery(id);
    r.apply(
      new RecoveryRequested(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: r.aggregateType,
          aggregateVersion: r.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        occurredAt,
      ),
    );
    return r;
  }

  static fromSnapshot(snapshot: RecoverySnapshot): Recovery {
    const r = new Recovery(new RecoveryId(snapshot.id));
    r._userId = new UserId(snapshot.userId);
    r._verified = snapshot.verified;
    r._completed = snapshot.completed;
    r._expired = snapshot.expired;
    r._cancelled = snapshot.cancelled;
    r._resendCount = snapshot.resendCount;
    r._createdAt = new Date(snapshot.createdAt);
    r._verifiedAt = snapshot.verifiedAt ? new Date(snapshot.verifiedAt) : null;
    r._completedAt = snapshot.completedAt ? new Date(snapshot.completedAt) : null;
    r._expiredAt = snapshot.expiredAt ? new Date(snapshot.expiredAt) : null;
    r._cancelledAt = snapshot.cancelledAt ? new Date(snapshot.cancelledAt) : null;
    r.restoreVersion(snapshot.version);
    return r;
  }

  static reconstitute(id: RecoveryId): Recovery {
    return new Recovery(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get verified(): boolean {
    return this._verified;
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

  get resendCount(): number {
    return this._resendCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get verifiedAt(): Date | null {
    return this._verifiedAt;
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
    return !this._verified && !this._completed && !this._expired && !this._cancelled;
  }

  resend(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    if (this._resendCount >= MAX_RESEND_COUNT) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-max-resends-reached',
        { resendCount: this._resendCount, maxResendCount: MAX_RESEND_COUNT },
      );
    }
    this.apply(
      new RecoveryResent(
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
        this._resendCount + 1,
      ),
    );
  }

  verify(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    if (this._verified) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-already-verified',
        {},
      );
    }
    this.apply(
      new RecoveryVerified(
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

  complete(eventId: EventId, occurredAt: Date): void {
    if (!this._verified) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-not-verified',
        {},
      );
    }
    if (this._completed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-already-completed',
        {},
      );
    }
    this.apply(
      new RecoveryCompleted(
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
      new RecoveryExpired(
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
      new RecoveryCancelled(
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

  toSnapshot(): RecoverySnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      verified: this._verified,
      completed: this._completed,
      expired: this._expired,
      cancelled: this._cancelled,
      resendCount: this._resendCount,
      createdAt: this._createdAt.toISOString(),
      verifiedAt: this._verifiedAt?.toISOString() ?? null,
      completedAt: this._completedAt?.toISOString() ?? null,
      expiredAt: this._expiredAt?.toISOString() ?? null,
      cancelledAt: this._cancelledAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof RecoveryRequested) {
      this._userId = event.userId;
      this._resendCount = 0;
      if (this.version === 0) {
        this._createdAt = event.initiatedAt;
      }
    } else if (event instanceof RecoveryResent) {
      this._resendCount = event.resendCount;
    } else if (event instanceof RecoveryVerified) {
      this._verified = true;
      this._verifiedAt = event.verifiedAt;
    } else if (event instanceof RecoveryCompleted) {
      this._completed = true;
      this._completedAt = event.completedAt;
    } else if (event instanceof RecoveryExpired) {
      this._expired = true;
      this._expiredAt = event.expiredAt;
    } else if (event instanceof RecoveryCancelled) {
      this._cancelled = true;
      this._cancelledAt = event.cancelledAt;
    }
  }

  private requirePending(): void {
    if (this._completed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-already-completed',
        {},
      );
    }
    if (this._expired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-already-expired',
        {},
      );
    }
    if (this._cancelled) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'recovery-already-cancelled',
        {},
      );
    }
  }
}
