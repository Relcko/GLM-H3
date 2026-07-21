import { AggregateRoot } from "@relcko/kernel";
import type { DomainEvent } from "@relcko/kernel";

import type { ScheduleId } from "./value-objects";
import { DistributionType, ScheduleStatus } from "./value-objects";
import { assertScheduleTransition } from "./state-machine";
import type { CreateDistributionScheduleCommandData, ActivateScheduleCommandData, CloseScheduleCommandData } from "./events";
import {
  DistributionScheduleCreatedEvent,
  DistributionScheduleActivatedEvent,
  DistributionScheduleClosedEvent,
  type DistributionScheduleCreatedPayload,
  type DistributionScheduleActivatedPayload,
  type DistributionScheduleClosedPayload,
  type ScheduleDomainEvent,
} from "./events";

export class DistributionScheduleAggregate extends AggregateRoot<ScheduleId> {
  public readonly aggregateType = "schedule";

  private _distributionType: DistributionType = DistributionType.Dividend;
  private _propertyId = "";
  private _periodStart = 0;
  private _periodEnd = 0;
  private _totalAmount = 0n;
  private _perUnitAmount: bigint | null = null;
  private _currency = "";
  private _status: ScheduleStatus = ScheduleStatus.Draft;
  private _distributionIds: string[] = [];

  private constructor(id: ScheduleId) {
    super(id);
  }

  static create(id: ScheduleId, data: CreateDistributionScheduleCommandData): DistributionScheduleAggregate {
    const aggregate = new DistributionScheduleAggregate(id);
    aggregate.createSchedule(data);
    return aggregate;
  }

  static loadFromHistory(id: ScheduleId, history: readonly DomainEvent[]): DistributionScheduleAggregate {
    const aggregate = new DistributionScheduleAggregate(id);
    aggregate.loadFromHistory(history);
    return aggregate;
  }

  get status(): ScheduleStatus {
    return this._status;
  }

  private createSchedule(data: CreateDistributionScheduleCommandData): void {
    const payload: DistributionScheduleCreatedPayload = {
      distributionType: data.distributionType,
      propertyId: data.propertyId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalAmount: data.totalAmount,
      perUnitAmount: data.perUnitAmount,
      currency: data.currency,
    };
    this.apply(
      new DistributionScheduleCreatedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  activate(data: ActivateScheduleCommandData): void {
    assertScheduleTransition(this._status, ScheduleStatus.Executing);

    const now = Date.now();
    const payload: DistributionScheduleActivatedPayload = {
      activatedAt: now,
      activatedBy: data.activatedBy,
    };
    this.apply(
      new DistributionScheduleActivatedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  close(data: CloseScheduleCommandData): void {
    assertScheduleTransition(this._status, ScheduleStatus.Completed);

    const now = Date.now();
    const payload: DistributionScheduleClosedPayload = {
      closedAt: now,
      closedBy: data.closedBy,
      reason: data.reason,
    };
    this.apply(
      new DistributionScheduleClosedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  cancel(data: CloseScheduleCommandData): void {
    if (this._status === ScheduleStatus.Executing || this._status === ScheduleStatus.Completed) {
      assertScheduleTransition(this._status, ScheduleStatus.Cancelled);
      return;
    }
    assertScheduleTransition(this._status, ScheduleStatus.Cancelled);

    const now = Date.now();
    const payload: DistributionScheduleClosedPayload = {
      closedAt: now,
      closedBy: data.closedBy,
      reason: data.reason,
    };
    this.apply(
      new DistributionScheduleClosedEvent(
        String(this.id),
        this.aggregateType,
        this.nextVersion(),
        payload,
      ),
    );
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case "treasury.distribution.schedule.created": {
        const e = event as DistributionScheduleCreatedEvent;
        this._distributionType = e.data.distributionType;
        this._propertyId = e.data.propertyId;
        this._periodStart = e.data.periodStart;
        this._periodEnd = e.data.periodEnd;
        this._totalAmount = e.data.totalAmount;
        this._perUnitAmount = e.data.perUnitAmount;
        this._currency = e.data.currency;
        this._status = ScheduleStatus.Draft;
        break;
      }
      case "treasury.distribution.schedule.activated": {
        this._status = ScheduleStatus.Executing;
        break;
      }
      case "treasury.distribution.schedule.closed": {
        const e = event as DistributionScheduleClosedEvent;
        if (this._status === ScheduleStatus.Executing) {
          this._status = ScheduleStatus.Completed;
        } else {
          this._status = ScheduleStatus.Cancelled;
        }
        break;
      }
    }
  }
}
