import { EventCatalog } from './event-catalog';

import type { SessionId, UserId } from '../value-objects';

export interface SessionCreatedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly createdAt: Date;
  readonly expiresAt: Date;
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

export const SessionEventTypeMap = {
  created: EventCatalog.SESSION_CREATED,
  expired: EventCatalog.SESSION_EXPIRED,
  revoked: EventCatalog.SESSION_REVOKED,
  refreshed: EventCatalog.SESSION_REFRESHED,
} as const;
