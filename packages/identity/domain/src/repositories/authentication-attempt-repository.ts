import type { AuthenticationAttempt } from '../aggregates';
import type { AttemptId, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IAuthenticationAttemptRepository extends IRepository<
  AuthenticationAttempt,
  AttemptId
> {
  findByUserId(userId: UserId): Promise<readonly AuthenticationAttempt[]>;
  countRecentByUserId(userId: UserId, since: Date): Promise<number>;
}
