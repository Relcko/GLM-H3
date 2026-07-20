import type { Recovery } from '../aggregates';
import type { RecoveryId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IRecoveryRepository extends IRepository<Recovery, RecoveryId> {
  findByUserId(userId: string): Promise<readonly Recovery[]>;
  findPendingByUserId(userId: string): Promise<Recovery | null>;
}
