import { ValueObject } from "@relcko/kernel";

export type DistributionId = string & { __brand: "DistributionId" };
export type RecipientId = string & { __brand: "RecipientId" };
export type ScheduleId = string & { __brand: "ScheduleId" };
export type SagaId = string & { __brand: "SagaId" };
export type IdempotencyKey = string & { __brand: "IdempotencyKey" };

export enum DistributionType {
  Dividend = "dividend",
  RevenueShare = "revenue_share",
  Buyback = "buyback",
}

export enum DistributionStatus {
  Draft = "draft",
  Approved = "approved",
  RecipientsMaterialized = "recipients_materialized",
  Executing = "executing",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum RecipientStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
  Recovered = "recovered",
}

export enum ScheduleStatus {
  Draft = "draft",
  Scheduled = "scheduled",
  Executing = "executing",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum RecoveryStrategy {
  ReAttempt = "re_attempt",
  Manual = "manual",
  WriteOff = "write_off",
}

export enum AllocationMethod {
  ProRata = "pro_rata",
  Fixed = "fixed",
  Tiered = "tiered",
}

export enum SagaState {
  Running = "running",
  Suspended = "suspended",
  Compensating = "compensating",
  Completed = "completed",
  Failed = "failed",
}

export interface EligibilityProofData {
  readonly snapshotId: string;
  readonly positionIndex: number;
  readonly quantity: bigint;
  readonly perUnitAmount: bigint;
  readonly hash: string;
}

export class EligibilityProof extends ValueObject {
  public readonly snapshotId: string;
  public readonly positionIndex: number;
  public readonly quantity: bigint;
  public readonly perUnitAmount: bigint;
  public readonly hash: string;

  private constructor(data: EligibilityProofData) {
    super();
    this.snapshotId = data.snapshotId;
    this.positionIndex = data.positionIndex;
    this.quantity = data.quantity;
    this.perUnitAmount = data.perUnitAmount;
    this.hash = data.hash;
  }

  static create(data: EligibilityProofData): EligibilityProof {
    return new EligibilityProof(data);
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.snapshotId, this.positionIndex, this.quantity, this.perUnitAmount, this.hash];
  }
}

export interface FinalTotalsData {
  readonly totalDistributed: bigint;
  readonly totalFailed: bigint;
  readonly totalRecovered: bigint;
  readonly paidCount: number;
  readonly failedCount: number;
  readonly recoveredCount: number;
  readonly writeOffAmount: bigint;
}

export class FinalTotals extends ValueObject {
  public readonly totalDistributed: bigint;
  public readonly totalFailed: bigint;
  public readonly totalRecovered: bigint;
  public readonly paidCount: number;
  public readonly failedCount: number;
  public readonly recoveredCount: number;
  public readonly writeOffAmount: bigint;

  constructor(data: FinalTotalsData) {
    super();
    this.totalDistributed = data.totalDistributed;
    this.totalFailed = data.totalFailed;
    this.totalRecovered = data.totalRecovered;
    this.paidCount = data.paidCount;
    this.failedCount = data.failedCount;
    this.recoveredCount = data.recoveredCount;
    this.writeOffAmount = data.writeOffAmount;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [
      this.totalDistributed,
      this.totalFailed,
      this.totalRecovered,
      this.paidCount,
      this.failedCount,
      this.recoveredCount,
      this.writeOffAmount,
    ];
  }
}

export class Money extends ValueObject {
  public readonly amount: bigint;
  public readonly currency: string;

  constructor(amount: bigint, currency: string) {
    super();
    this.amount = amount;
    this.currency = currency;
  }

  static fromMinor(amount: bigint, currency: string): Money {
    return new Money(amount, currency);
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.amount, this.currency];
  }
}

export type Currency = string;
