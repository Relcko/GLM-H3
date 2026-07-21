import { AggregateRoot } from "@relcko/kernel";
import type { DomainEvent } from "@relcko/kernel";

import type { DistributionId, RecipientId } from "./value-objects";
import { RecipientStatus } from "./value-objects";
import type { EligibilityProof } from "./value-objects";
import { assertRecipientTransition } from "./state-machine";
import {
  RecipientAlreadyPaidError,
  RecipientPaymentFailedError,
  RecoveryExhaustedError,
  RecoveryNotPossibleError,
  SettlementRefMismatchError,
} from "./errors";
import type {
  ProcessRecipientPaymentCommandData,
  RecoverRecipientPaymentCommandData,
} from "./events";
import {
  RecipientMaterializedEvent,
  RecipientPaymentPaidEvent,
  RecipientPaymentFailedEvent,
  RecipientPaymentRecoveredEvent,
  type RecipientMaterializedPayload,
  type RecipientPaymentPaidPayload,
  type RecipientPaymentFailedPayload,
  type RecipientPaymentRecoveredPayload,
  type RecipientDomainEvent,
} from "./events";

const MAX_RECOVERY_ATTEMPTS = 3;

export class DistributionRecipientAggregate extends AggregateRoot<RecipientId> {
  public readonly aggregateType = "recipient";

  private _distributionId: DistributionId = "" as unknown as DistributionId;
  private _investorId = "";
  private _eligibleAmount = 0n;
  private _currency = "";
  private _status: RecipientStatus = RecipientStatus.Pending;
  private _paidAmount = 0n;
  private _settlementRef: string | null = null;
  private _txHash: string | null = null;
  private _failureReason: string | null = null;
  private _recoveryAttempts = 0;
  private _proof: EligibilityProof | null = null;

  private constructor(id: RecipientId) {
    super(id);
  }

  static create(
    id: RecipientId,
    distributionId: DistributionId,
    investorId: string,
    eligibleAmount: bigint,
    currency: string,
    proof: EligibilityProof,
  ): DistributionRecipientAggregate {
    const aggregate = new DistributionRecipientAggregate(id);
    aggregate.materialize(distributionId, investorId, eligibleAmount, currency, proof);
    return aggregate;
  }

  static loadFromHistory(id: RecipientId, history: readonly DomainEvent[]): DistributionRecipientAggregate {
    const aggregate = new DistributionRecipientAggregate(id);
    aggregate.loadFromHistory(history);
    return aggregate;
  }

  get status(): RecipientStatus {
    return this._status;
  }

  get recoveryAttempts(): number {
    return this._recoveryAttempts;
  }

  get settlementRef(): string | null {
    return this._settlementRef;
  }

  get distributionId(): DistributionId {
    return this._distributionId;
  }

  get investorId(): string {
    return this._investorId;
  }

  get eligibleAmount(): bigint {
    return this._eligibleAmount;
  }

  private materialize(
    distributionId: DistributionId,
    investorId: string,
    eligibleAmount: bigint,
    currency: string,
    proof: EligibilityProof,
  ): void {
    const payload: RecipientMaterializedPayload = {
      distributionId,
      investorId,
      eligibleAmount,
      currency,
      proof,
    };
    this.apply(
      new RecipientMaterializedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  pay(data: ProcessRecipientPaymentCommandData): void {
    assertRecipientTransition(this._status, RecipientStatus.Paid);

    if (data.amount > this._eligibleAmount) {
      throw new RecipientPaymentFailedError(
        String(this.id),
        `Payment amount ${data.amount} exceeds eligible amount ${this._eligibleAmount}`,
      );
    }

    const now = Date.now();
    const payload: RecipientPaymentPaidPayload = {
      distributionId: data.distributionId,
      investorId: data.investorId,
      amount: data.amount,
      currency: data.currency,
      settlementRef: data.settlementRef,
      txHash: null,
      paidAt: now,
    };
    this.apply(
      new RecipientPaymentPaidEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  fail(
    distributionId: DistributionId,
    investorId: string,
    amount: bigint,
    currency: string,
    reason: string,
    errorCode: string,
  ): void {
    assertRecipientTransition(this._status, RecipientStatus.Failed);

    const payload: RecipientPaymentFailedPayload = {
      distributionId,
      investorId,
      amount,
      currency,
      reason,
      errorCode,
    };
    this.apply(
      new RecipientPaymentFailedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  recover(data: RecoverRecipientPaymentCommandData, settlementRef: string): void {
    assertRecipientTransition(this._status, RecipientStatus.Recovered);

    if (this._recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      throw new RecoveryExhaustedError(String(this.id), this._recoveryAttempts);
    }

    const now = Date.now();
    const payload: RecipientPaymentRecoveredPayload = {
      distributionId: data.distributionId,
      investorId: this._investorId,
      amount: this._eligibleAmount,
      currency: this._currency,
      settlementRef,
      recoveredAt: now,
    };
    this.apply(
      new RecipientPaymentRecoveredEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  retry(
    distributionId: DistributionId,
    investorId: string,
    amount: bigint,
    currency: string,
    reason: string,
    errorCode: string,
  ): void {
    if (this._status !== RecipientStatus.Failed) {
      throw new RecoveryNotPossibleError(String(this.id));
    }

    if (this._recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      throw new RecoveryExhaustedError(String(this.id), this._recoveryAttempts);
    }

    const payload: RecipientPaymentFailedPayload = {
      distributionId,
      investorId,
      amount,
      currency,
      reason,
      errorCode,
    };
    this.apply(
      new RecipientPaymentFailedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case "treasury.recipient.materialized": {
        const e = event as RecipientMaterializedEvent;
        this._distributionId = e.data.distributionId;
        this._investorId = e.data.investorId;
        this._eligibleAmount = e.data.eligibleAmount;
        this._currency = e.data.currency;
        this._status = RecipientStatus.Pending;
        this._proof = e.data.proof;
        break;
      }
      case "treasury.recipient.paid": {
        const e = event as RecipientPaymentPaidEvent;
        this._status = RecipientStatus.Paid;
        this._paidAmount = e.data.amount;
        this._settlementRef = e.data.settlementRef;
        this._txHash = e.data.txHash;
        break;
      }
      case "treasury.recipient.failed": {
        const e = event as RecipientPaymentFailedEvent;
        const wasFailed = this._status === RecipientStatus.Failed;
        this._status = RecipientStatus.Failed;
        this._failureReason = e.data.reason;
        if (wasFailed) {
          this._recoveryAttempts += 1;
        }
        break;
      }
      case "treasury.recipient.recovered": {
        const e = event as RecipientPaymentRecoveredEvent;
        this._status = RecipientStatus.Recovered;
        this._settlementRef = e.data.settlementRef;
        this._recoveryAttempts += 1;
        break;
      }
    }
  }
}
