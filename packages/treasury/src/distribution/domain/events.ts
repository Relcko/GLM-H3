import crypto from "node:crypto";
import { DomainEvent, type DomainEventProps } from "@relcko/kernel";

import type { DistributionId, EligibilityProof, IdempotencyKey, SagaId, ScheduleId } from "./value-objects";
import { AllocationMethod, DistributionType, FinalTotals, RecoveryStrategy } from "./value-objects";

export const DistributionEventType = {
  DistributionCreated: "treasury.distribution.created",
  DistributionApproved: "treasury.distribution.approved",
  DistributionRecipientsMaterialized: "treasury.distribution.recipients_materialized",
  DistributionExecutionStarted: "treasury.distribution.execution_started",
  DistributionExecutionFinalized: "treasury.distribution.execution_finalized",
  DistributionCancelled: "treasury.distribution.cancelled",
  DistributionReconciled: "treasury.distribution.reconciled",
  RecipientMaterialized: "treasury.recipient.materialized",
  RecipientPaymentPaid: "treasury.recipient.paid",
  RecipientPaymentFailed: "treasury.recipient.failed",
  RecipientPaymentRecovered: "treasury.recipient.recovered",
  DistributionScheduleCreated: "treasury.distribution.schedule.created",
  DistributionScheduleActivated: "treasury.distribution.schedule.activated",
  DistributionScheduleClosed: "treasury.distribution.schedule.closed",
  DistributionSagaStarted: "treasury.distribution.saga.started",
  DistributionSagaCheckpoint: "treasury.distribution.saga.checkpoint",
  DistributionSagaCompensated: "treasury.distribution.saga.compensated",
  DistributionSagaCompleted: "treasury.distribution.saga.completed",
  DistributionSagaSuspended: "treasury.distribution.saga.suspended",
  DistributionSagaFailed: "treasury.distribution.saga.failed",
} as const;

export type DistributionEventType = (typeof DistributionEventType)[keyof typeof DistributionEventType];

export interface EventMetadata {
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey?: IdempotencyKey;
  readonly timestamp: number;
}

export interface CommandMetadata extends EventMetadata {
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey?: IdempotencyKey;
  readonly timestamp: number;
  readonly sessionId?: string;
}

export interface DistributionEvent {
  readonly eventType: DistributionEventType;
  readonly aggregateId: string;
  readonly version: number;
  readonly data: Record<string, unknown>;
  readonly metadata: EventMetadata;
}

export interface DistributionCommand {
  readonly type: string;
  readonly aggregateId: string;
  readonly data: Record<string, unknown>;
  readonly metadata: CommandMetadata;
}

function eventId(): string {
  return crypto.randomUUID();
}

function eventProps(
  aggregateId: string,
  aggregateType: string,
  version: number,
): Omit<DomainEventProps, "schemaVersion"> {
  return {
    eventId: eventId() as unknown as DomainEventProps["eventId"],
    aggregateId,
    aggregateType,
    aggregateVersion: version,
    occurredAt: new Date(),
  };
}

export interface DistributionCreatedPayload {
  readonly distributionType: DistributionType;
  readonly sourceAccountId: string;
  readonly totalAmount: bigint;
  readonly currency: string;
  readonly perUnitAmount: bigint | null;
  readonly scheduleId: ScheduleId | null;
  readonly snapshotId: string | null;
  readonly allocationMethod: AllocationMethod;
  readonly proposalRef: { readonly proposalId: string; readonly proposalType: string } | null;
  readonly metadata: Record<string, unknown> | null;
}

export class DistributionCreatedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionCreated;
  public readonly data: DistributionCreatedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionCreatedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface ApprovalRecord {
  readonly approverId: string;
  readonly keyId: string;
  readonly signature: string;
  readonly signedAt: number;
}

export interface DistributionApprovedPayload {
  readonly approvals: readonly ApprovalRecord[];
  readonly approvalEpoch: number;
  readonly reservationJournalId: string;
}

export class DistributionApprovedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionApproved;
  public readonly data: DistributionApprovedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionApprovedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionRecipientsMaterializedPayload {
  readonly snapshotId: string;
  readonly recipientCount: number;
  readonly totalEligibleAmount: bigint;
  readonly manifestHash: string;
  readonly materializedAt: number;
}

export class DistributionRecipientsMaterializedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionRecipientsMaterialized;
  public readonly data: DistributionRecipientsMaterializedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionRecipientsMaterializedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionExecutionStartedPayload {
  readonly recipientCount: number;
  readonly sagaId: SagaId;
  readonly startedAt: number;
}

export class DistributionExecutionStartedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionExecutionStarted;
  public readonly data: DistributionExecutionStartedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionExecutionStartedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionExecutionFinalizedPayload {
  readonly finalStatus: "Completed" | "Failed";
  readonly finalTotals: FinalTotals;
  readonly sagaId: SagaId;
  readonly finalizedAt: number;
}

export class DistributionExecutionFinalizedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionExecutionFinalized;
  public readonly data: DistributionExecutionFinalizedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionExecutionFinalizedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionCancelledPayload {
  readonly reason: string | null;
  readonly cancelledBy: string;
  readonly cancelledAt: number;
}

export class DistributionCancelledEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionCancelled;
  public readonly data: DistributionCancelledPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionCancelledPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionReconciledPayload {
  readonly expectedTotal: bigint;
  readonly actualTotal: bigint;
  readonly discrepancy: bigint;
  readonly reconciled: boolean;
  readonly reconciledAt: number;
}

export class DistributionReconciledEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionReconciled;
  public readonly data: DistributionReconciledPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionReconciledPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface RecipientMaterializedPayload {
  readonly distributionId: DistributionId;
  readonly investorId: string;
  readonly eligibleAmount: bigint;
  readonly currency: string;
  readonly proof: EligibilityProof;
}

export class RecipientMaterializedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.RecipientMaterialized;
  public readonly data: RecipientMaterializedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: RecipientMaterializedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface RecipientPaymentPaidPayload {
  readonly distributionId: DistributionId;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly txHash: string | null;
  readonly paidAt: number;
}

export class RecipientPaymentPaidEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.RecipientPaymentPaid;
  public readonly data: RecipientPaymentPaidPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: RecipientPaymentPaidPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface RecipientPaymentFailedPayload {
  readonly distributionId: DistributionId;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly reason: string;
  readonly errorCode: string;
}

export class RecipientPaymentFailedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.RecipientPaymentFailed;
  public readonly data: RecipientPaymentFailedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: RecipientPaymentFailedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface RecipientPaymentRecoveredPayload {
  readonly distributionId: DistributionId;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly recoveredAt: number;
}

export class RecipientPaymentRecoveredEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.RecipientPaymentRecovered;
  public readonly data: RecipientPaymentRecoveredPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: RecipientPaymentRecoveredPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionScheduleCreatedPayload {
  readonly distributionType: DistributionType;
  readonly propertyId: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly totalAmount: bigint;
  readonly perUnitAmount: bigint | null;
  readonly currency: string;
}

export class DistributionScheduleCreatedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionScheduleCreated;
  public readonly data: DistributionScheduleCreatedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionScheduleCreatedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionScheduleActivatedPayload {
  readonly activatedAt: number;
  readonly activatedBy: string;
}

export class DistributionScheduleActivatedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionScheduleActivated;
  public readonly data: DistributionScheduleActivatedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionScheduleActivatedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionScheduleClosedPayload {
  readonly closedAt: number;
  readonly closedBy: string;
  readonly reason: string | null;
}

export class DistributionScheduleClosedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionScheduleClosed;
  public readonly data: DistributionScheduleClosedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionScheduleClosedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export type DistributionDomainEvent =
  | DistributionCreatedEvent
  | DistributionApprovedEvent
  | DistributionRecipientsMaterializedEvent
  | DistributionExecutionStartedEvent
  | DistributionExecutionFinalizedEvent
  | DistributionCancelledEvent
  | DistributionReconciledEvent;

export type RecipientDomainEvent =
  | RecipientMaterializedEvent
  | RecipientPaymentPaidEvent
  | RecipientPaymentFailedEvent
  | RecipientPaymentRecoveredEvent;

export type ScheduleDomainEvent =
  | DistributionScheduleCreatedEvent
  | DistributionScheduleActivatedEvent
  | DistributionScheduleClosedEvent;

export interface CreateDistributionCommandData {
  readonly distributionType: DistributionType;
  readonly sourceAccountId: string;
  readonly totalAmount: bigint;
  readonly currency: string;
  readonly perUnitAmount?: bigint;
  readonly scheduleId?: ScheduleId;
  readonly snapshotId?: string;
  readonly proposalRef?: { readonly proposalId: string; readonly proposalType: string };
  readonly allocationMethod: AllocationMethod;
  readonly metadata?: Record<string, unknown>;
}

export interface ApproveDistributionCommandData {
  readonly approvals: readonly ApprovalRecord[];
}

export interface MaterializeDistributionRecipientsCommandData {
  readonly snapshotId: string;
  readonly eligibilityRuleId: string | null;
}

export interface ExecuteDistributionCommandData {
  readonly sagaOptions?: {
    readonly perRecipientTimeoutMs?: number;
    readonly maxParallelism?: number;
    readonly recoveryPolicyId?: string | null;
  };
}

export interface ProcessRecipientPaymentCommandData {
  readonly distributionId: DistributionId;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
}

export interface RecoverRecipientPaymentCommandData {
  readonly distributionId: DistributionId;
  readonly strategy: RecoveryStrategy;
}

export interface ReconcileDistributionCommandData {
  readonly expectedTotal: bigint;
  readonly actualTotal: bigint;
}

export interface CreateDistributionScheduleCommandData {
  readonly distributionType: DistributionType;
  readonly propertyId: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly totalAmount: bigint;
  readonly perUnitAmount: bigint | null;
  readonly currency: string;
}

export interface ActivateScheduleCommandData {
  readonly activatedBy: string;
}

export interface CloseScheduleCommandData {
  readonly closedBy: string;
  readonly reason: string | null;
}

// ─── Saga Lifecycle Events ───────────────────────────────────────────

export interface DistributionSagaStartedPayload {
  readonly distributionId: string;
  readonly totalRecipients: number;
  readonly perRecipientTimeoutMs: number;
  readonly maxParallelism: number;
  readonly recoveryPolicyId: string | null;
  readonly startedAt: number;
}

export class DistributionSagaStartedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaStarted;
  public readonly data: DistributionSagaStartedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaStartedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionSagaCheckpointPayload {
  readonly distributionId: string;
  readonly checkpointIndex: number;
  readonly pendingCount: number;
  readonly inFlightCount: number;
  readonly paidCount: number;
  readonly failedCount: number;
  readonly recoveredCount: number;
  readonly timestamp: number;
}

export class DistributionSagaCheckpointEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaCheckpoint;
  public readonly data: DistributionSagaCheckpointPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaCheckpointPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionSagaCompensatedPayload {
  readonly distributionId: string;
  readonly reason: string;
  readonly timestamp: number;
}

export class DistributionSagaCompensatedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaCompensated;
  public readonly data: DistributionSagaCompensatedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaCompensatedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionSagaCompletedPayload {
  readonly distributionId: string;
  readonly totalRecipients: number;
  readonly paidCount: number;
  readonly failedCount: number;
  readonly recoveredCount: number;
  readonly timestamp: number;
}

export class DistributionSagaCompletedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaCompleted;
  public readonly data: DistributionSagaCompletedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaCompletedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionSagaSuspendedPayload {
  readonly distributionId: string;
  readonly reason: string;
  readonly timestamp: number;
}

export class DistributionSagaSuspendedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaSuspended;
  public readonly data: DistributionSagaSuspendedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaSuspendedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export interface DistributionSagaFailedPayload {
  readonly distributionId: string;
  readonly reason: string;
  readonly failedCount: number;
  readonly unrecoverableCount: number;
  readonly timestamp: number;
}

export class DistributionSagaFailedEvent extends DomainEvent {
  public readonly eventType = DistributionEventType.DistributionSagaFailed;
  public readonly data: DistributionSagaFailedPayload;

  constructor(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: DistributionSagaFailedPayload,
  ) {
    super(eventProps(aggregateId, aggregateType, version) as DomainEventProps);
    this.data = data;
  }
}

export type SagaDomainEvent =
  | DistributionSagaStartedEvent
  | DistributionSagaCheckpointEvent
  | DistributionSagaCompensatedEvent
  | DistributionSagaCompletedEvent
  | DistributionSagaSuspendedEvent
  | DistributionSagaFailedEvent;
