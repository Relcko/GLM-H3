import type { SessionId, UserId } from '../value-objects';

export interface GetSessionQuery {
  readonly sessionId: SessionId;
}

export interface ListSessionsQuery {
  readonly userId: UserId;
  readonly activeOnly?: boolean;
}
