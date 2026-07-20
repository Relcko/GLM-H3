import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  EmailVerificationInitiated,
  EmailVerificationCompleted,
  EmailVerificationFailed,
} from '../../events/email-verification-events';
import { EmailAddress, EmailVerificationId, UserId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export const MAX_RESEND_COUNT = 5;

export interface EmailVerificationSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly token: string;
  readonly completed: boolean;
  readonly failed: boolean;
  readonly failureReason: string | null;
  readonly expiresAt: string;
  readonly resendCount: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
  readonly version: number;
}

export class EmailVerification extends AggregateRoot<EmailVerificationId> {
  readonly aggregateType = 'EmailVerification';

  private _userId!: UserId;
  private _email!: EmailAddress;
  private _token!: string;
  private _completed = false;
  private _failed = false;
  private _failureReason: string | null = null;
  private _expiresAt!: Date;
  private _resendCount = 0;
  private _createdAt!: Date;
  private _completedAt: Date | null = null;
  private _failedAt: Date | null = null;

  private constructor(id: EmailVerificationId) {
    super(id);
  }

  static create(
    id: EmailVerificationId,
    userId: UserId,
    email: EmailAddress,
    token: string,
    expiresAt: Date,
    eventId: EventId,
    occurredAt: Date,
  ): EmailVerification {
    if (!token.trim()) {
      throw new InvariantViolationError(
        'EmailVerification',
        id.toString(),
        'email-verification-token-empty',
        {},
      );
    }
    if (expiresAt <= occurredAt) {
      throw new InvariantViolationError(
        'EmailVerification',
        id.toString(),
        'email-verification-expires-at-past',
        { expiresAt: expiresAt.toISOString(), occurredAt: occurredAt.toISOString() },
      );
    }
    const ev = new EmailVerification(id);
    ev.apply(
      new EmailVerificationInitiated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: ev.aggregateType,
          aggregateVersion: ev.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        email,
        token.trim(),
        expiresAt,
        0,
        occurredAt,
      ),
    );
    return ev;
  }

  static fromSnapshot(snapshot: EmailVerificationSnapshot): EmailVerification {
    const ev = new EmailVerification(new EmailVerificationId(snapshot.id));
    ev._userId = new UserId(snapshot.userId);
    ev._email = EmailAddress.fromRaw(snapshot.email);
    ev._token = snapshot.token;
    ev._completed = snapshot.completed;
    ev._failed = snapshot.failed;
    ev._failureReason = snapshot.failureReason;
    ev._expiresAt = new Date(snapshot.expiresAt);
    ev._resendCount = snapshot.resendCount;
    ev._createdAt = new Date(snapshot.createdAt);
    ev._completedAt = snapshot.completedAt ? new Date(snapshot.completedAt) : null;
    ev._failedAt = snapshot.failedAt ? new Date(snapshot.failedAt) : null;
    ev.restoreVersion(snapshot.version);
    return ev;
  }

  static reconstitute(id: EmailVerificationId): EmailVerification {
    return new EmailVerification(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get email(): EmailAddress {
    return this._email;
  }

  get token(): string {
    return this._token;
  }

  get completed(): boolean {
    return this._completed;
  }

  get failed(): boolean {
    return this._failed;
  }

  get failureReason(): string | null {
    return this._failureReason;
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

  get failedAt(): Date | null {
    return this._failedAt;
  }

  get pending(): boolean {
    return !this._completed && !this._failed;
  }

  resend(token: string, expiresAt: Date, eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    if (!token.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'email-verification-token-empty',
        {},
      );
    }
    if (expiresAt <= occurredAt) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'email-verification-expires-at-past',
        { expiresAt: expiresAt.toISOString(), occurredAt: occurredAt.toISOString() },
      );
    }
    if (this._resendCount >= MAX_RESEND_COUNT) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'email-verification-max-resends-reached',
        { resendCount: this._resendCount, maxResendCount: MAX_RESEND_COUNT },
      );
    }
    this.apply(
      new EmailVerificationInitiated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._email,
        token.trim(),
        expiresAt,
        this._resendCount + 1,
        occurredAt,
      ),
    );
  }

  verify(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new EmailVerificationCompleted(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._email,
        occurredAt,
      ),
    );
  }

  expire(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new EmailVerificationFailed(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._email,
        'expired',
        occurredAt,
      ),
    );
  }

  cancel(eventId: EventId, occurredAt: Date): void {
    this.requirePending();
    this.apply(
      new EmailVerificationFailed(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        this._email,
        'cancelled',
        occurredAt,
      ),
    );
  }

  toSnapshot(): EmailVerificationSnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      email: this._email.toString(),
      token: this._token,
      completed: this._completed,
      failed: this._failed,
      failureReason: this._failureReason,
      expiresAt: this._expiresAt.toISOString(),
      resendCount: this._resendCount,
      createdAt: this._createdAt.toISOString(),
      completedAt: this._completedAt?.toISOString() ?? null,
      failedAt: this._failedAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof EmailVerificationInitiated) {
      this._userId = event.userId;
      this._email = event.email;
      this._token = event.token;
      this._expiresAt = event.expiresAt;
      this._resendCount = event.resendCount;
      if (this.version === 0) {
        this._createdAt = event.initiatedAt;
      }
    } else if (event instanceof EmailVerificationCompleted) {
      this._completed = true;
      this._completedAt = event.completedAt;
    } else if (event instanceof EmailVerificationFailed) {
      this._failed = true;
      this._failureReason = event.failureReason;
      this._failedAt = event.failedAt;
    }
  }

  private requirePending(): void {
    if (this._completed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'email-verification-already-completed',
        {},
      );
    }
    if (this._failed) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'email-verification-already-failed',
        { failureReason: this._failureReason ?? undefined },
      );
    }
  }
}
