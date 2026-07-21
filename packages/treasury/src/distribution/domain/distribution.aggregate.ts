import { AggregateRoot } from "@relcko/kernel";
import type { DomainEvent } from "@relcko/kernel";

import type { DistributionId, SagaId, ScheduleId } from "./value-objects";
import { AllocationMethod, DistributionStatus, DistributionType, FinalTotals, Money } from "./value-objects";
import { assertDistributionTransition } from "./state-machine";
import {
  DistributionAlreadyFinalizedError,
  DistributionManifestMismatchError,
  DistributionNotMaterializedError,
} from "./errors";
import type {
  CreateDistributionCommandData,
  ApproveDistributionCommandData,
  MaterializeDistributionRecipientsCommandData,
  ExecuteDistributionCommandData,
  ReconcileDistributionCommandData,
} from "./events";
import {
  DistributionApprovedEvent,
  DistributionCancelledEvent,
  DistributionCreatedEvent,
  DistributionExecutionFinalizedEvent,
  DistributionExecutionStartedEvent,
  DistributionReconciledEvent,
  DistributionRecipientsMaterializedEvent,
  type DistributionDomainEvent,
  type DistributionCreatedPayload,
  type DistributionApprovedPayload,
  type DistributionRecipientsMaterializedPayload,
  type DistributionExecutionStartedPayload,
  type DistributionExecutionFinalizedPayload,
  type DistributionCancelledPayload,
  type DistributionReconciledPayload,
} from "./events";

export class DistributionAggregate extends AggregateRoot<DistributionId> {
  public readonly aggregateType = "distribution";

  private _distributionType: DistributionType = DistributionType.Dividend;
  private _status: DistributionStatus = DistributionStatus.Draft;
  private _sourceAccountId = "";
  private _totalAmount = 0n;
  private _currency = "";
  private _perUnitAmount: bigint | null = null;
  private _materializationManifestHash: string | null = null;
  private _recipientCount = 0;
  private _sagaId: SagaId | null = null;
  private _finalTotals: FinalTotals | null = null;
  private _scheduleId: ScheduleId | null = null;
  private _snapshotId: string | null = null;
  private _proposalRef: { readonly proposalId: string; readonly proposalType: string } | null = null;
  private _allocationMethod: AllocationMethod = AllocationMethod.ProRata;
  private _metadata: Record<string, unknown> = {};

  private constructor(id: DistributionId) {
    super(id);
  }

  static create(id: DistributionId, data: CreateDistributionCommandData): DistributionAggregate {
    const aggregate = new DistributionAggregate(id);
    aggregate.create(data);
    return aggregate;
  }

  static loadFromHistory(id: DistributionId, history: readonly DomainEvent[]): DistributionAggregate {
    const aggregate = new DistributionAggregate(id);
    aggregate.loadFromHistory(history);
    return aggregate;
  }

  get status(): DistributionStatus {
    return this._status;
  }

  get totalAmount(): bigint {
    return this._totalAmount;
  }

  get currency(): string {
    return this._currency;
  }

  get materializationManifestHash(): string | null {
    return this._materializationManifestHash;
  }

  get finalTotals(): FinalTotals | null {
    return this._finalTotals;
  }

  get sagaId(): SagaId | null {
    return this._sagaId;
  }

  get recipientCount(): number {
    return this._recipientCount;
  }

  private create(data: CreateDistributionCommandData): void {
    const payload: DistributionCreatedPayload = {
      distributionType: data.distributionType,
      sourceAccountId: data.sourceAccountId,
      totalAmount: data.totalAmount,
      currency: data.currency,
      perUnitAmount: data.perUnitAmount ?? null,
      scheduleId: data.scheduleId ?? null,
      snapshotId: data.snapshotId ?? null,
      allocationMethod: data.allocationMethod,
      proposalRef: data.proposalRef ?? null,
      metadata: data.metadata ?? null,
    };
    this.apply(
      new DistributionCreatedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  approve(data: ApproveDistributionCommandData, approvalEpoch: number, reservationJournalId: string): void {
    assertDistributionTransition(this._status, DistributionStatus.Approved);

    const payload: DistributionApprovedPayload = {
      approvals: data.approvals,
      approvalEpoch,
      reservationJournalId,
    };
    this.apply(
      new DistributionApprovedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  materializeRecipients(
    snapshotId: string,
    totalEligibleAmount: bigint,
    recipientCount: number,
    manifestHash: string,
  ): void {
    assertDistributionTransition(this._status, DistributionStatus.RecipientsMaterialized);

    if (totalEligibleAmount !== this._totalAmount) {
      throw new DistributionManifestMismatchError(String(this.id));
    }

    const now = Date.now();
    const payload: DistributionRecipientsMaterializedPayload = {
      snapshotId,
      recipientCount,
      totalEligibleAmount,
      manifestHash,
      materializedAt: now,
    };
    this.apply(
      new DistributionRecipientsMaterializedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  execute(data: ExecuteDistributionCommandData, sagaId: SagaId): void {
    assertDistributionTransition(this._status, DistributionStatus.Executing);

    if (this._materializationManifestHash === null) {
      throw new DistributionNotMaterializedError(String(this.id));
    }

    const now = Date.now();
    const payload: DistributionExecutionStartedPayload = {
      recipientCount: this._recipientCount,
      sagaId,
      startedAt: now,
    };
    this.apply(
      new DistributionExecutionStartedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  complete(finalTotals: FinalTotals, sagaId: SagaId): void {
    assertDistributionTransition(this._status, DistributionStatus.Completed);

    this.assertFinalTotalsValid(finalTotals);

    const now = Date.now();
    const payload: DistributionExecutionFinalizedPayload = {
      finalStatus: "Completed",
      finalTotals,
      sagaId,
      finalizedAt: now,
    };
    this.apply(
      new DistributionExecutionFinalizedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  fail(finalTotals: FinalTotals, sagaId: SagaId): void {
    assertDistributionTransition(this._status, DistributionStatus.Failed);

    this.assertFinalTotalsValid(finalTotals);

    const now = Date.now();
    const payload: DistributionExecutionFinalizedPayload = {
      finalStatus: "Failed",
      finalTotals,
      sagaId,
      finalizedAt: now,
    };
    this.apply(
      new DistributionExecutionFinalizedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  cancel(reason: string | null, cancelledBy: string): void {
    const target: Record<string, DistributionStatus> = {
      [DistributionStatus.Draft]: DistributionStatus.Cancelled,
      [DistributionStatus.Approved]: DistributionStatus.Cancelled,
      [DistributionStatus.RecipientsMaterialized]: DistributionStatus.Cancelled,
    };
    const next = target[this._status];
    if (next === undefined) {
      assertDistributionTransition(this._status, DistributionStatus.Cancelled);
      return;
    }

    const now = Date.now();
    const payload: DistributionCancelledPayload = {
      reason,
      cancelledBy,
      cancelledAt: now,
    };
    this.apply(
      new DistributionCancelledEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  reconcile(expectedTotal: bigint, actualTotal: bigint): void {
    const now = Date.now();
    const discrepancy = expectedTotal - actualTotal;
    const payload: DistributionReconciledPayload = {
      expectedTotal,
      actualTotal,
      discrepancy,
      reconciled: discrepancy === 0n,
      reconciledAt: now,
    };
    this.apply(
      new DistributionReconciledEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case "treasury.distribution.created": {
        const e = event as DistributionCreatedEvent;
        this._distributionType = e.data.distributionType;
        this._status = DistributionStatus.Draft;
        this._sourceAccountId = e.data.sourceAccountId;
        this._totalAmount = e.data.totalAmount;
        this._currency = e.data.currency;
        this._perUnitAmount = e.data.perUnitAmount;
        this._scheduleId = e.data.scheduleId;
        this._snapshotId = e.data.snapshotId;
        this._allocationMethod = e.data.allocationMethod;
        this._proposalRef = e.data.proposalRef;
        this._metadata = e.data.metadata ?? {};
        break;
      }
      case "treasury.distribution.approved": {
        this._status = DistributionStatus.Approved;
        break;
      }
      case "treasury.distribution.recipients_materialized": {
        const e = event as DistributionRecipientsMaterializedEvent;
        this._status = DistributionStatus.RecipientsMaterialized;
        this._materializationManifestHash = e.data.manifestHash;
        this._recipientCount = e.data.recipientCount;
        this._snapshotId = e.data.snapshotId;
        break;
      }
      case "treasury.distribution.execution_started": {
        const e = event as DistributionExecutionStartedEvent;
        this._status = DistributionStatus.Executing;
        this._sagaId = e.data.sagaId;
        break;
      }
      case "treasury.distribution.execution_finalized": {
        const e = event as DistributionExecutionFinalizedEvent;
        this._status = e.data.finalStatus === "Completed" ? DistributionStatus.Completed : DistributionStatus.Failed;
        this._finalTotals = e.data.finalTotals;
        break;
      }
      case "treasury.distribution.cancelled": {
        this._status = DistributionStatus.Cancelled;
        break;
      }
      case "treasury.distribution.reconciled": {
        break;
      }
    }
  }

  private assertFinalTotalsValid(totals: FinalTotals): void {
    const distributed = totals.totalDistributed;
    const failed = totals.totalFailed;
    const recovered = totals.totalRecovered;
    const writeOff = totals.writeOffAmount;
    const sum = distributed + failed + recovered + writeOff;

    if (sum !== this._totalAmount) {
      throw new DistributionAlreadyFinalizedError(
        `Final totals sum (${sum}) does not match totalAmount (${this._totalAmount})`,
      );
    }
  }
}
