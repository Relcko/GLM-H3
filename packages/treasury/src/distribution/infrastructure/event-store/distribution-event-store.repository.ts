import type { EventStore } from "@relcko/event-store";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionAggregate } from "../../domain/distribution.aggregate";
import type { DistributionId, ScheduleId } from "../../domain/value-objects";
import type { IDistributionRepository } from "../../application/repositories";
import { DistributionNotFoundError } from "../../domain/errors";
import { BaseEventStoreRepository } from "./base-event-store.repository";

export class DistributionEventStoreRepository
  extends BaseEventStoreRepository<DistributionAggregate, DistributionId>
  implements IDistributionRepository
{
  protected readonly aggregateTypeName = "distribution";

  private readonly scheduleIndex = new Map<string, Set<string>>();

  constructor(eventStore: EventStore) {
    super(eventStore);
  }

  protected createAggregate(
    id: DistributionId,
    history: readonly DomainEvent[],
  ): DistributionAggregate {
    return DistributionAggregate.loadFromHistory(id, history);
  }

  async findById(id: DistributionId): Promise<DistributionAggregate | null> {
    return this.buildAggregate(id);
  }

  async getById(id: DistributionId): Promise<DistributionAggregate> {
    const aggregate = await this.buildAggregate(id);
    if (!aggregate) throw new DistributionNotFoundError(String(id));
    return aggregate;
  }

  async save(aggregate: DistributionAggregate): Promise<void> {
    const expectedVersion = aggregate.version - aggregate.getUncommittedEvents().length;
    await this.appendEvents(aggregate, expectedVersion);
  }

  async delete(_id: DistributionId): Promise<void> {
    throw new Error("Distribution deletion is not supported");
  }

  async findByScheduleId(scheduleId: ScheduleId): Promise<DistributionAggregate[]> {
    const ids = this.scheduleIndex.get(String(scheduleId));
    if (!ids || ids.size === 0) return [];
    const results: DistributionAggregate[] = [];
    for (const id of ids) {
      const agg = await this.findById(id as unknown as DistributionId);
      if (agg) results.push(agg);
    }
    return results;
  }

  indexScheduleId(distributionId: DistributionId, scheduleId: ScheduleId): void {
    const key = String(scheduleId);
    if (!this.scheduleIndex.has(key)) {
      this.scheduleIndex.set(key, new Set());
    }
    this.scheduleIndex.get(key)!.add(String(distributionId));
  }
}
