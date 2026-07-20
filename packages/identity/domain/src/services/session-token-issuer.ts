import type { SessionId, UserId } from '../value-objects';

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
}

export interface ISessionTokenIssuer {
  issue(userId: UserId, sessionId: SessionId, ttlMs?: number): Promise<SessionTokens>;
  refresh(refreshToken: string): Promise<SessionTokens>;
  revoke(refreshToken: string): Promise<void>;
  validateAccessToken(accessToken: string): Promise<SessionId | null>;
}
