import { TreasuryError } from "../../errors";

export class DistributionError extends TreasuryError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "DISTRIBUTION_ERROR", metadata);
  }
}

export class DistributionNotFoundError extends TreasuryError {
  constructor(id: string) {
    super(`Distribution ${id} not found`, "DISTRIBUTION_NOT_FOUND", { id });
  }
}

export class DistributionInvalidStatusError extends DistributionError {
  constructor(id: string, currentStatus: string, expectedStatus: string) {
    super(
      `Invalid status transition for distribution ${id}: current=${currentStatus}, expected one of [${expectedStatus}]`,
      { distributionId: id, currentStatus, expectedStatus },
    );
  }
}

export class DistributionNotMaterializedError extends DistributionError {
  constructor(id: string) {
    super(`Distribution ${id} has not been materialized`, { distributionId: id });
  }
}

export class DistributionManifestMismatchError extends DistributionError {
  constructor(id: string) {
    super(`Distribution ${id} manifest hash mismatch — recipient set may have been tampered`, { distributionId: id });
  }
}

export class DistributionAlreadyFinalizedError extends DistributionError {
  constructor(id: string) {
    super(`Distribution ${id} is already finalized`, { distributionId: id });
  }
}

export class InsufficientReservedFundsError extends DistributionError {
  constructor(accountId: string, available: bigint, required: bigint) {
    super(`Insufficient reserved funds in account ${accountId}: ${available} < ${required}`, { accountId, available: available.toString(), required: required.toString() });
  }
}

export class RecipientNotFoundError extends DistributionError {
  constructor(id: string) {
    super(`Recipient ${id} not found`, { recipientId: id });
  }
}

export class RecipientAlreadyPaidError extends DistributionError {
  constructor(id: string) {
    super(`Recipient ${id} has already been paid`, { recipientId: id });
  }
}

export class RecipientPaymentFailedError extends DistributionError {
  constructor(recipientId: string, reason: string) {
    super(`Payment to recipient ${recipientId} failed: ${reason}`, { recipientId, reason });
  }
}

export class RecoveryExhaustedError extends DistributionError {
  constructor(recipientId: string, attempts: number) {
    super(`Recovery exhausted for recipient ${recipientId} after ${attempts} attempts`, { recipientId, attempts });
  }
}

export class DistributionScheduleNotFoundError extends TreasuryError {
  constructor(id: string) {
    super(`Distribution schedule ${id} not found`, "SCHEDULE_NOT_FOUND", { scheduleId: id });
  }
}

export class ScheduleInvalidStatusError extends DistributionError {
  constructor(id: string, currentStatus: string, expectedStatus: string) {
    super(`Invalid schedule status transition for ${id}: current=${currentStatus}, expected one of [${expectedStatus}]`, { scheduleId: id, currentStatus, expectedStatus });
  }
}

export class ExecutionSagaError extends DistributionError {
  constructor(sagaId: string, message: string) {
    super(`Saga ${sagaId} execution error: ${message}`, { sagaId });
  }
}

export class RecoveryNotPossibleError extends DistributionError {
  constructor(recipientId: string) {
    super(`Recovery not possible for recipient ${recipientId}`, { recipientId });
  }
}

export class ReconciliationError extends DistributionError {
  constructor(distributionId: string, message: string) {
    super(`Reconciliation error for distribution ${distributionId}: ${message}`, { distributionId });
  }
}

export class MultiSigThresholdNotMetError extends DistributionError {
  constructor(distributionId: string, required: number, actual: number) {
    super(`Multi-signature threshold not met for distribution ${distributionId}: required ${required}, got ${actual}`, { distributionId, required, actual });
  }
}

export class StaleApprovalSignatureError extends DistributionError {
  constructor(distributionId: string, reason: string) {
    super(`Stale approval signature for distribution ${distributionId}: ${reason}`, { distributionId });
  }
}

export class UnauthorizedDistributionActionError extends DistributionError {
  constructor(action: string, actorId: string) {
    super(`Unauthorized distribution action '${action}' for actor ${actorId}`, { action, actorId });
  }
}

export class AuditChainBrokenError extends DistributionError {
  constructor(aggregateType: string, aggregateId: string) {
    super(`Audit chain integrity violation for ${aggregateType} ${aggregateId}`, { aggregateType, aggregateId });
  }
}

export class IdempotencyKeyConflictError extends DistributionError {
  constructor(key: string) {
    super(`Idempotency key '${key}' conflicts with a different request payload`, { idempotencyKey: key });
  }
}

export class SettlementRefMismatchError extends DistributionError {
  constructor(ref: string) {
    super(`Settlement reference '${ref}' reused for a different payment payload`, { settlementRef: ref });
  }
}

export class SagaNotFoundError extends DistributionError {
  constructor(sagaId: string) {
    super(`Saga ${sagaId} not found`, { sagaId });
  }
}

export class SagaInvalidStatusError extends DistributionError {
  constructor(sagaId: string, current: string, expected: string) {
    super(`Invalid saga state transition for ${sagaId}: current=${current}, expected one of [${expected}]`, { sagaId, current, expected });
  }
}

export class SagaAlreadyActiveError extends DistributionError {
  constructor(distributionId: string) {
    super(`Saga already active for distribution ${distributionId}`, { distributionId });
  }
}
