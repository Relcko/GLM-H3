import { EventCatalog } from './event-catalog';

import type { RecoveryId, UserId } from '../value-objects';

export interface RecoveryInitiatedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly method: string;
  readonly initiatedAt: Date;
  readonly expiresAt: Date;
}

export interface RecoveryApprovedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly approvedBy: UserId;
  readonly approvedAt: Date;
}

export interface RecoveryCompletedPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly completedAt: Date;
}

export interface RecoveryExpiredPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly expiredAt: Date;
}

export interface RecoveryCancelledPayload {
  readonly recoveryId: RecoveryId;
  readonly userId: UserId;
  readonly cancelledAt: Date;
}

export const RecoveryEventTypeMap = {
  initiated: EventCatalog.RECOVERY_INITIATED,
  approved: EventCatalog.RECOVERY_APPROVED,
  completed: EventCatalog.RECOVERY_COMPLETED,
  expired: EventCatalog.RECOVERY_EXPIRED,
  cancelled: EventCatalog.RECOVERY_CANCELLED,
} as const;
