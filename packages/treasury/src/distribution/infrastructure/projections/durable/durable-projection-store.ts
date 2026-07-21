import type { DistributionId, RecipientId, ScheduleId, SagaId } from "../../../domain/value-objects";
import type {
  DistributionStatus, DistributionType, AllocationMethod, FinalTotals,
  RecipientStatus, ScheduleStatus,
} from "../../../domain/value-objects";
import type { DistributionProjectionRow } from "../distribution.projection";
import type { RecipientProjectionRow } from "../recipient.projection";
import type { ScheduleProjectionRow } from "../schedule.projection";
import type { ProgressProjectionRow } from "../progress.projection";

export interface DurableStoreError {
  readonly type: "version_conflict" | "not_found" | "integrity_error";
  readonly message: string;
}

export interface DurableStoreResult<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: DurableStoreError | null;
}

export interface IDurableProjectionStore<TRow> {
  readonly name: string;
  save(id: string, row: TRow, expectedVersion: number): Promise<DurableStoreResult<TRow>>;
  findById(id: string): Promise<TRow | null>;
  findMany(predicate?: (row: TRow) => boolean): Promise<TRow[]>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
  getVersion(id: string): Promise<number>;
  count(): Promise<number>;
}

export class InMemoryDurableProjectionStore<TRow extends { version: number }> implements IDurableProjectionStore<TRow> {
  protected readonly rows = new Map<string, TRow>();
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async save(id: string, row: TRow, expectedVersion: number): Promise<DurableStoreResult<TRow>> {
    const existing = this.rows.get(id);
    if (existing && existing.version !== expectedVersion) {
      return {
        success: false,
        data: null,
        error: {
          type: "version_conflict",
          message: `Version conflict for ${id}: expected ${expectedVersion}, current ${existing.version}`,
        },
      };
    }
    this.rows.set(id, { ...row, version: row.version });
    return { success: true, data: row, error: null };
  }

  async findById(id: string): Promise<TRow | null> {
    return this.rows.get(id) ?? null;
  }

  async findMany(predicate?: (row: TRow) => boolean): Promise<TRow[]> {
    const all = Array.from(this.rows.values());
    return predicate ? all.filter(predicate) : all;
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }

  async reset(): Promise<void> {
    this.rows.clear();
  }

  async getVersion(id: string): Promise<number> {
    const row = this.rows.get(id);
    return row?.version ?? 0;
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}

export class DistributionProjectionStore extends InMemoryDurableProjectionStore<DistributionProjectionRow> {
  constructor() {
    super("distribution_projection");
  }

  async findByStatus(status: DistributionStatus): Promise<DistributionProjectionRow[]> {
    return this.findMany((r) => r.status === status);
  }

  async findByScheduleId(scheduleId: ScheduleId): Promise<DistributionProjectionRow[]> {
    return this.findMany((r) => r.scheduleId !== null && String(r.scheduleId) === String(scheduleId));
  }
}

export class RecipientProjectionStore extends InMemoryDurableProjectionStore<RecipientProjectionRow> {
  constructor() {
    super("recipient_projection");
  }

  async findByDistributionId(distributionId: DistributionId): Promise<RecipientProjectionRow[]> {
    return this.findMany((r) => String(r.distributionId) === String(distributionId));
  }

  async findByInvestorId(investorId: string): Promise<RecipientProjectionRow[]> {
    return this.findMany((r) => r.investorId === investorId);
  }

  async findByStatus(status: RecipientStatus): Promise<RecipientProjectionRow[]> {
    return this.findMany((r) => r.status === status);
  }
}

export class ScheduleProjectionStore extends InMemoryDurableProjectionStore<ScheduleProjectionRow> {
  constructor() {
    super("schedule_projection");
  }

  async findByPropertyId(propertyId: string): Promise<ScheduleProjectionRow[]> {
    return this.findMany((r) => r.propertyId === propertyId);
  }

  async findByStatus(status: ScheduleStatus): Promise<ScheduleProjectionRow[]> {
    return this.findMany((r) => r.status === status);
  }
}

export class ProgressProjectionStore extends InMemoryDurableProjectionStore<ProgressProjectionRow> {
  constructor() {
    super("progress_projection");
  }

  async findByDistributionId(distributionId: DistributionId): Promise<ProgressProjectionRow | null> {
    const key = String(distributionId);
    return this.findById(key);
  }

  async saveProgress(distributionId: string, row: ProgressProjectionRow): Promise<DurableStoreResult<ProgressProjectionRow>> {
    return this.save(distributionId, row, row.version);
  }
}
