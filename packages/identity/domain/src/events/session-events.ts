import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { RefreshTokenHash } from '../value-objects';
import type { SessionId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface SessionCreatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly refreshTokenHash: RefreshTokenHash | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly deviceName: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface SessionActivatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly activatedAt: Date;
}

export interface SessionExpiredPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly expiredAt: Date;
}

export interface SessionRevokedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly reason: string;
  readonly revokedAt: Date;
}

export interface SessionRefreshedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly refreshedAt: Date;
  readonly newExpiresAt: Date;
}

export interface SessionLastActivityUpdatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly lastActivityAt: Date;
}

export interface SessionClientUpdatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly deviceName: string | null;
}

export interface SessionRefreshTokenRotatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly refreshTokenHash: RefreshTokenHash;
}

export class SessionCreated extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_CREATED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly refreshTokenHash: RefreshTokenHash | null,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
    readonly deviceName: string | null,
    readonly expiresAt: Date,
    readonly createdAt: Date,
  ) {
    super(props);
  }
}

export class SessionActivated extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class SessionExpired extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_EXPIRED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly expiredAt: Date,
  ) {
    super(props);
  }
}

export class SessionRevoked extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_REVOKED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly reason: string,
    readonly revokedAt: Date,
  ) {
    super(props);
  }
}

export class SessionRefreshed extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_REFRESHED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly refreshedAt: Date,
    readonly newExpiresAt: Date,
  ) {
    super(props);
  }
}

export class SessionLastActivityUpdated extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_LAST_ACTIVITY_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly lastActivityAt: Date,
  ) {
    super(props);
  }
}

export class SessionClientUpdated extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_CLIENT_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
    readonly deviceName: string | null,
  ) {
    super(props);
  }
}

export class SessionRefreshTokenRotated extends DomainEvent {
  readonly eventType = EventCatalog.SESSION_REFRESH_TOKEN_ROTATED;

  constructor(
    props: DomainEventProps,
    readonly sessionId: SessionId,
    readonly userId: UserId,
    readonly refreshTokenHash: RefreshTokenHash,
  ) {
    super(props);
  }
}

export const SessionEventTypeMap = {
  created: EventCatalog.SESSION_CREATED,
  activated: EventCatalog.SESSION_ACTIVATED,
  expired: EventCatalog.SESSION_EXPIRED,
  revoked: EventCatalog.SESSION_REVOKED,
  refreshed: EventCatalog.SESSION_REFRESHED,
  lastActivityUpdated: EventCatalog.SESSION_LAST_ACTIVITY_UPDATED,
  clientUpdated: EventCatalog.SESSION_CLIENT_UPDATED,
  refreshTokenRotated: EventCatalog.SESSION_REFRESH_TOKEN_ROTATED,
} as const;
