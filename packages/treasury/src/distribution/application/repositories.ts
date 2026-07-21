import type { IRepository } from "@relcko/kernel";

import type { DistributionAggregate } from "../domain/distribution.aggregate";
import type { DistributionRecipientAggregate } from "../domain/distribution-recipient.aggregate";
import type { DistributionScheduleAggregate } from "../domain/distribution-schedule.aggregate";
import type { DistributionSaga } from "../saga/distribution.saga";
import type {
  DistributionId,
  RecipientId,
  ScheduleId,
  SagaId,
  DistributionStatus,
  DistributionType,
  ScheduleStatus,
  RecipientStatus,
  SagaState,
  FinalTotals,
  AllocationMethod,
} from "../domain/value-objects";

export interface IDistributionRepository extends IRepository<DistributionAggregate, DistributionId> {
  findByScheduleId(scheduleId: ScheduleId): Promise<DistributionAggregate[]>;
}

export interface IDistributionRecipientRepository extends IRepository<DistributionRecipientAggregate, RecipientId> {
  findByDistributionId(distributionId: DistributionId): Promise<DistributionRecipientAggregate[]>;
  findByInvestorId(investorId: string): Promise<DistributionRecipientAggregate[]>;
  findByDistributionAndInvestor(
    distributionId: DistributionId,
    investorId: string,
  ): Promise<DistributionRecipientAggregate | null>;
}

export interface IDistributionScheduleRepository extends IRepository<DistributionScheduleAggregate, ScheduleId> {
  findByPropertyId(propertyId: string): Promise<DistributionScheduleAggregate[]>;
  findByStatus(status: ScheduleStatus): Promise<DistributionScheduleAggregate[]>;
}

export interface ISagaRepository {
  save(saga: DistributionSaga): Promise<void>;
  findBySagaId(sagaId: SagaId): Promise<DistributionSaga | null>;
  findByDistributionId(distributionId: DistributionId): Promise<DistributionSaga | null>;

  acquire(sagaId: SagaId, workerId: string, ttlMs: number): Promise<boolean>;
  release(sagaId: SagaId, workerId: string): Promise<void>;
}

export interface DistributionReadModel {
  id: DistributionId;
  distributionType: DistributionType;
  status: DistributionStatus;
  sourceAccountId: string;
  totalAmount: bigint;
  currency: string;
  perUnitAmount: bigint | null;
  recipientCount: number;
  materializationManifestHash: string | null;
  sagaId: SagaId | null;
  finalTotals: FinalTotals | null;
  scheduleId: ScheduleId | null;
  snapshotId: string | null;
  allocationMethod: AllocationMethod;
  proposalRef: { readonly proposalId: string; readonly proposalType: string } | null;
  createdAt: number;
  updatedAt: number;
}

export interface DistributionProgressReadModel {
  distributionId: DistributionId;
  totalRecipients: number;
  paidCount: number;
  failedCount: number;
  recoveredCount: number;
  pendingCount: number;
  inFlightCount: number;
  percentage: number;
}

export interface SagaStateReadModel {
  sagaId: SagaId;
  distributionId: DistributionId;
  state: SagaState;
  pendingRecipients: readonly string[];
  inFlightRecipients: readonly string[];
  paidCount: number;
  failedCount: number;
  recoveredCount: number;
  checkpointAt: number;
  recoveryPolicyId: string | null;
  startedAt: number;
  updatedAt: number;
  version: number;
}

export interface RecipientReadModel {
  id: RecipientId;
  distributionId: DistributionId;
  investorId: string;
  eligibleAmount: bigint;
  currency: string;
  status: RecipientStatus;
  paidAmount: bigint;
  settlementRef: string | null;
  txHash: string | null;
  failureReason: string | null;
  recoveryAttempts: number;
}

export interface ScheduleReadModel {
  id: ScheduleId;
  distributionType: DistributionType;
  propertyId: string;
  periodStart: number;
  periodEnd: number;
  totalAmount: bigint;
  perUnitAmount: bigint | null;
  currency: string;
  status: ScheduleStatus;
  distributionIds: readonly string[];
  createdAt: number;
  updatedAt: number;
}

export interface DistributionFilterCriteria {
  status?: DistributionStatus;
  distributionType?: DistributionType;
  fromDate?: number;
  toDate?: number;
  sourceAccountId?: string;
}

export interface IDistributionQueryRepository {
  findById(id: DistributionId): Promise<DistributionReadModel | null>;
  findMany(criteria?: DistributionFilterCriteria): Promise<DistributionReadModel[]>;
}

export interface IRecipientQueryRepository {
  findById(id: RecipientId): Promise<RecipientReadModel | null>;
  findByDistributionId(distributionId: DistributionId): Promise<RecipientReadModel[]>;
  findByInvestorId(investorId: string): Promise<RecipientReadModel[]>;
}

export interface ISagaQueryRepository {
  findBySagaId(sagaId: SagaId): Promise<SagaStateReadModel | null>;
  findByDistributionId(distributionId: DistributionId): Promise<SagaStateReadModel | null>;
}

export interface IScheduleQueryRepository {
  findById(id: ScheduleId): Promise<ScheduleReadModel | null>;
  findByPropertyId(propertyId: string): Promise<ScheduleReadModel[]>;
  findByStatus(status: ScheduleStatus): Promise<ScheduleReadModel[]>;
  findMany(): Promise<ScheduleReadModel[]>;
}
