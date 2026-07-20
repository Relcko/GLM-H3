import type { PasswordReset } from '../aggregates';
import type { PasswordResetId, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IPasswordResetRepository extends IRepository<PasswordReset, PasswordResetId> {
  findByUserId(userId: UserId): Promise<readonly PasswordReset[]>;
  findPendingByUserId(userId: UserId): Promise<readonly PasswordReset[]>;
}
