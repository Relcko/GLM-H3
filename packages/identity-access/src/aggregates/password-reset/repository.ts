import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { PasswordReset } from './index';

export interface PasswordResetRepository extends IRepository<PasswordReset, EntityId> {
  findPendingByUserId(userId: string): Promise<PasswordReset | null>;
  findByTokenHash(tokenHash: string): Promise<PasswordReset | null>;
}
