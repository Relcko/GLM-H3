import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import { SessionActiveError, SessionRevokedError, SessionExpiredError } from '../../errors';
import {
  SessionActivated,
  SessionClientUpdated,
  SessionCreated,
  SessionExpired,
  SessionLastActivityUpdated,
  SessionRefreshTokenRotated,
  SessionRefreshed,
  SessionRevoked,
} from '../../events/session-events';
import { RefreshTokenHash, SessionId, UserId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface SessionSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly deviceName: string | null;
  readonly active: boolean;
  readonly expired: boolean;
  readonly revoked: boolean;
  readonly revokeReason: string | null;
  readonly createdAt: string;
  readonly activatedAt: string | null;
  readonly expiresAt: string;
  readonly lastActivityAt: string | null;
  readonly refreshedAt: string | null;
  readonly revokedAt: string | null;
  readonly version: number;
}

export class Session extends AggregateRoot<SessionId> {
  readonly aggregateType = 'Session';

  private _userId!: UserId;
  private _refreshTokenHash: RefreshTokenHash | null = null;
  private _ipAddress: string | null = null;
  private _userAgent: string | null = null;
  private _deviceName: string | null = null;
  private _active = false;
  private _expired = false;
  private _revoked = false;
  private _revokeReason: string | null = null;
  private _createdAt!: Date;
  private _activatedAt: Date | null = null;
  private _expiresAt!: Date;
  private _lastActivityAt: Date | null = null;
  private _refreshedAt: Date | null = null;
  private _revokedAt: Date | null = null;

  private constructor(id: SessionId) {
    super(id);
  }

  static create(
    id: SessionId,
    userId: UserId,
    expiresAt: Date,
    refreshTokenHash: RefreshTokenHash | null,
    ipAddress: string | null,
    userAgent: string | null,
    deviceName: string | null,
    eventId: EventId,
    occurredAt: Date,
  ): Session {
    if (expiresAt <= occurredAt) {
      throw new InvariantViolationError('Session', id.toString(), 'session-expires-at-in-past', {
        expiresAt: expiresAt.toISOString(),
        occurredAt: occurredAt.toISOString(),
      });
    }
    const session = new Session(id);
    session.apply(
      new SessionCreated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: session.aggregateType,
          aggregateVersion: session.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        refreshTokenHash,
        ipAddress,
        userAgent,
        deviceName,
        expiresAt,
        occurredAt,
      ),
    );
    return session;
  }

  static fromSnapshot(snapshot: SessionSnapshot): Session {
    const session = new Session(new SessionId(snapshot.id));
    session._userId = new UserId(snapshot.userId);
    session._refreshTokenHash = snapshot.refreshTokenHash
      ? new RefreshTokenHash(snapshot.refreshTokenHash)
      : null;
    session._ipAddress = snapshot.ipAddress;
    session._userAgent = snapshot.userAgent;
    session._deviceName = snapshot.deviceName;
    session._active = snapshot.active;
    session._expired = snapshot.expired;
    session._revoked = snapshot.revoked;
    session._revokeReason = snapshot.revokeReason;
    session._createdAt = new Date(snapshot.createdAt);
    session._activatedAt = snapshot.activatedAt ? new Date(snapshot.activatedAt) : null;
    session._expiresAt = new Date(snapshot.expiresAt);
    session._lastActivityAt = snapshot.lastActivityAt ? new Date(snapshot.lastActivityAt) : null;
    session._refreshedAt = snapshot.refreshedAt ? new Date(snapshot.refreshedAt) : null;
    session._revokedAt = snapshot.revokedAt ? new Date(snapshot.revokedAt) : null;
    session.restoreVersion(snapshot.version);
    return session;
  }

  static reconstitute(id: SessionId): Session {
    return new Session(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get refreshTokenHash(): RefreshTokenHash | null {
    return this._refreshTokenHash;
  }

  get ipAddress(): string | null {
    return this._ipAddress;
  }

  get userAgent(): string | null {
    return this._userAgent;
  }

  get deviceName(): string | null {
    return this._deviceName;
  }

  get active(): boolean {
    return this._active;
  }

  get expired(): boolean {
    return this._expired;
  }

  get revoked(): boolean {
    return this._revoked;
  }

  get revokeReason(): string | null {
    return this._revokeReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get activatedAt(): Date | null {
    return this._activatedAt;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get lastActivityAt(): Date | null {
    return this._lastActivityAt;
  }

  get refreshedAt(): Date | null {
    return this._refreshedAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  activate(eventId: EventId, occurredAt: Date): void {
    this.requireValid();
    if (this._active) {
      throw new SessionActiveError(this.id.toString());
    }
    this.apply(
      new SessionActivated(
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

  refresh(newExpiresAt: Date, eventId: EventId, occurredAt: Date): void {
    if (this._expired) {
      throw new SessionExpiredError(this.id.toString());
    }
    if (this._revoked) {
      throw new SessionRevokedError(this.id.toString());
    }
    if (newExpiresAt <= occurredAt) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'session-refresh-expires-at-in-past',
        { newExpiresAt: newExpiresAt.toISOString(), occurredAt: occurredAt.toISOString() },
      );
    }
    this.apply(
      new SessionRefreshed(
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
        newExpiresAt,
      ),
    );
  }

  revoke(reason: string, eventId: EventId, occurredAt: Date): void {
    if (this._revoked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'session-already-revoked',
        {},
      );
    }
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'session-revoke-reason-required',
        {},
      );
    }
    this.apply(
      new SessionRevoked(
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

  expire(eventId: EventId, occurredAt: Date): void {
    if (this._expired) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'session-already-expired',
        {},
      );
    }
    if (this._revoked) {
      throw new SessionRevokedError(this.id.toString());
    }
    this.apply(
      new SessionExpired(
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

  recordLastActivity(eventId: EventId, occurredAt: Date): void {
    this.requireValid();
    this.apply(
      new SessionLastActivityUpdated(
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

  updateClientMetadata(
    ipAddress: string | null,
    userAgent: string | null,
    deviceName: string | null,
    eventId: EventId,
    occurredAt: Date,
  ): void {
    this.requireValid();
    const currentIp = this._ipAddress;
    const currentUa = this._userAgent;
    const currentDev = this._deviceName;
    if (ipAddress === currentIp && userAgent === currentUa && deviceName === currentDev) {
      return;
    }
    this.apply(
      new SessionClientUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        ipAddress,
        userAgent,
        deviceName,
      ),
    );
  }

  rotateRefreshToken(refreshTokenHash: RefreshTokenHash, eventId: EventId, occurredAt: Date): void {
    this.requireValid();
    this.apply(
      new SessionRefreshTokenRotated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        refreshTokenHash,
      ),
    );
  }

  toSnapshot(): SessionSnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      refreshTokenHash: this._refreshTokenHash?.toString() ?? null,
      ipAddress: this._ipAddress,
      userAgent: this._userAgent,
      deviceName: this._deviceName,
      active: this._active,
      expired: this._expired,
      revoked: this._revoked,
      revokeReason: this._revokeReason,
      createdAt: this._createdAt.toISOString(),
      activatedAt: this._activatedAt?.toISOString() ?? null,
      expiresAt: this._expiresAt.toISOString(),
      lastActivityAt: this._lastActivityAt?.toISOString() ?? null,
      refreshedAt: this._refreshedAt?.toISOString() ?? null,
      revokedAt: this._revokedAt?.toISOString() ?? null,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof SessionCreated) {
      this._userId = event.userId;
      this._refreshTokenHash = event.refreshTokenHash;
      this._ipAddress = event.ipAddress;
      this._userAgent = event.userAgent;
      this._deviceName = event.deviceName;
      this._createdAt = event.createdAt;
      this._expiresAt = event.expiresAt;
    } else if (event instanceof SessionActivated) {
      this._active = true;
      this._activatedAt = event.activatedAt;
    } else if (event instanceof SessionRefreshed) {
      this._expiresAt = event.newExpiresAt;
      this._refreshedAt = event.refreshedAt;
    } else if (event instanceof SessionRevoked) {
      this._revoked = true;
      this._active = false;
      this._revokeReason = event.reason;
      this._revokedAt = event.revokedAt;
    } else if (event instanceof SessionExpired) {
      this._expired = true;
      this._active = false;
    } else if (event instanceof SessionLastActivityUpdated) {
      this._lastActivityAt = event.lastActivityAt;
    } else if (event instanceof SessionClientUpdated) {
      this._ipAddress = event.ipAddress;
      this._userAgent = event.userAgent;
      this._deviceName = event.deviceName;
    } else if (event instanceof SessionRefreshTokenRotated) {
      this._refreshTokenHash = event.refreshTokenHash;
    }
  }

  private requireValid(): void {
    if (this._expired) {
      throw new SessionExpiredError(this.id.toString());
    }
    if (this._revoked) {
      throw new SessionRevokedError(this.id.toString());
    }
  }
}
