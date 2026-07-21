import type { IRepository } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import type { EmailVerification } from './index';

export interface EmailVerificationRepository extends IRepository<EmailVerification, EntityId> {
  findPendingByUserId(userId: string): Promise<EmailVerification | null>;
  findByTokenHash(tokenHash: string): Promise<EmailVerification | null>;
}
