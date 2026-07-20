import type { RecoveryId, UserId } from '../value-objects';

export interface InitiateRecoveryCommand {
  readonly userId: UserId;
  readonly method: string;
}

export interface ApproveRecoveryCommand {
  readonly recoveryId: RecoveryId;
  readonly approvedBy: UserId;
}

export interface CompleteRecoveryCommand {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
}

export interface CancelRecoveryCommand {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly reason?: string;
}
