import type { SessionId, UserId } from '../value-objects';

export interface CreateSessionCommand {
  readonly userId: UserId;
  readonly ttlMs?: number;
}

export interface RefreshSessionCommand {
  readonly sessionId: SessionId;
  readonly userId: UserId;
}

export interface RevokeSessionCommand {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly reason?: string;
}
