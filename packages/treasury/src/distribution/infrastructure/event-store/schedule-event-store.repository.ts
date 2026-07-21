import type { EventStore } from "@relcko/event-store";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionScheduleAggregate } from "../../domain/distribution-schedule.aggregate";
import type { ScheduleId } from "../../domain/value-objects";
import { ScheduleStatus } from "../../domain/value-objects";
import type { IDistributionScheduleRepository } from "../../application/repositories";
import { DistributionScheduleNotFoundError } from "../../domain/errors";
import { BaseEventStoreRepository } from "./base-event-store.repository";

export class ScheduleEventStoreRepository
  extends BaseEventStoreRepository<DistributionScheduleAggregate, ScheduleId>
  implements IDistributionScheduleRepository
{
  protected readonly aggregateTypeName = "schedule";

  private readonly propertyIndex = new Map<string, Set<string>>();
  private readonly statusIndex = new Map<ScheduleStatus, Set<string>>();

  constructor(eventStore: EventStore) {
    super(eventStore);
  }

  protected createAggregate(
    id: ScheduleId,
    history: readonly DomainEvent[],
  ): DistributionScheduleAggregate {
    return DistributionScheduleAggregate.loadFromHistory(id, history);
  }

  async findById(id: ScheduleId): Promise<DistributionScheduleAggregate | null> {
    return this.buildAggregate(id);
  }

  async getById(id: ScheduleId): Promise<DistributionScheduleAggregate> {
    const aggregate = await this.buildAggregate(id);
    if (!aggregate) throw new DistributionScheduleNotFoundError(String(id));
    return aggregate;
  }

  async save(aggregate: DistributionScheduleAggregate): Promise<void> {
    const expectedVersion = aggregate.version - aggregate.getUncommittedEvents().length;

    const idStr = String(aggregate.id);
    if (!this.statusIndex.has(aggregate.status)) {
      this.statusIndex.set(aggregate.status, new Set());
    }
    this.statusIndex.get(aggregate.status)!.add(idStr);

    await this.appendEvents(aggregate, expectedVersion);
  }

  async delete(_id: ScheduleId): Promise<void> {
    throw new Error("Schedule deletion is not supported");
  }

  async findByPropertyId(propertyId: string): Promise<DistributionScheduleAggregate[]> {
    const ids = this.propertyIndex.get(propertyId);
    if (!ids || ids.size === 0) return [];
    const results: DistributionScheduleAggregate[] = [];
    for (const id of ids) {
      const agg = await this.findById(id as unknown as ScheduleId);
      if (agg) results.push(agg);
    }
    return results;
  }

  async findByStatus(status: ScheduleStatus): Promise<DistributionScheduleAggregate[]> {
    const ids = this.statusIndex.get(status);
    if (!ids || ids.size === 0) return [];
    const results: DistributionScheduleAggregate[] = [];
    for (const id of ids) {
      const agg = await this.findById(id as unknown as ScheduleId);
      if (agg) results.push(agg);
    }
    return results;
  }

  indexPropertyId(scheduleId: ScheduleId, propertyId: string): void {
    if (!this.propertyIndex.has(propertyId)) {
      this.propertyIndex.set(propertyId, new Set());
    }
    this.propertyIndex.get(propertyId)!.add(String(scheduleId));
  }
}
