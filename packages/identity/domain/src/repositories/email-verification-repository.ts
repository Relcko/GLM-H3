import type { EmailVerification } from '../aggregates';
import type { EmailVerificationId, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IEmailVerificationRepository extends IRepository<
  EmailVerification,
  EmailVerificationId
> {
  findByUserId(userId: UserId): Promise<readonly EmailVerification[]>;
  findPendingByUserId(userId: UserId): Promise<readonly EmailVerification[]>;
}
