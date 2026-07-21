import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { AuthenticationAttempt } from './index';

export interface AuthenticationAttemptRepository extends IRepository<AuthenticationAttempt, EntityId> {
  findRecentByUser(userId: string, since: Date): Promise<AuthenticationAttempt[]>;
  countRecentFailures(userId: string, windowMs: number): Promise<number>;
  findLatestLockout(userId: string): Promise<AuthenticationAttempt | null>;
}
