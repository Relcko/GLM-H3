import type { EventStore } from "@relcko/event-store";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionRecipientAggregate } from "../../domain/distribution-recipient.aggregate";
import type { DistributionId, RecipientId } from "../../domain/value-objects";
import type { IDistributionRecipientRepository } from "../../application/repositories";
import { RecipientNotFoundError } from "../../domain/errors";
import { BaseEventStoreRepository } from "./base-event-store.repository";

export class RecipientEventStoreRepository
  extends BaseEventStoreRepository<DistributionRecipientAggregate, RecipientId>
  implements IDistributionRecipientRepository
{
  protected readonly aggregateTypeName = "recipient";

  private readonly distributionIndex = new Map<string, Set<string>>();
  private readonly investorIndex = new Map<string, Set<string>>();

  constructor(eventStore: EventStore) {
    super(eventStore);
  }

  protected createAggregate(
    id: RecipientId,
    history: readonly DomainEvent[],
  ): DistributionRecipientAggregate {
    return DistributionRecipientAggregate.loadFromHistory(id, history);
  }

  async findById(id: RecipientId): Promise<DistributionRecipientAggregate | null> {
    return this.buildAggregate(id);
  }

  async getById(id: RecipientId): Promise<DistributionRecipientAggregate> {
    const aggregate = await this.buildAggregate(id);
    if (!aggregate) throw new RecipientNotFoundError(String(id));
    return aggregate;
  }

  async save(aggregate: DistributionRecipientAggregate): Promise<void> {
    const expectedVersion = aggregate.version - aggregate.getUncommittedEvents().length;
    const distKey = String(aggregate.distributionId);
    const investorKey = aggregate.investorId;

    if (!this.distributionIndex.has(distKey)) {
      this.distributionIndex.set(distKey, new Set());
    }
    this.distributionIndex.get(distKey)!.add(String(aggregate.id));

    if (!this.investorIndex.has(investorKey)) {
      this.investorIndex.set(investorKey, new Set());
    }
    this.investorIndex.get(investorKey)!.add(String(aggregate.id));

    await this.appendEvents(aggregate, expectedVersion);
  }

  async delete(_id: RecipientId): Promise<void> {
    throw new Error("Recipient deletion is not supported");
  }

  async findByDistributionId(distributionId: DistributionId): Promise<DistributionRecipientAggregate[]> {
    const ids = this.distributionIndex.get(String(distributionId));
    if (!ids || ids.size === 0) return [];
    const results: DistributionRecipientAggregate[] = [];
    for (const id of ids) {
      const agg = await this.findById(id as unknown as RecipientId);
      if (agg) results.push(agg);
    }
    return results;
  }

  async findByInvestorId(investorId: string): Promise<DistributionRecipientAggregate[]> {
    const ids = this.investorIndex.get(investorId);
    if (!ids || ids.size === 0) return [];
    const results: DistributionRecipientAggregate[] = [];
    for (const id of ids) {
      const agg = await this.findById(id as unknown as RecipientId);
      if (agg) results.push(agg);
    }
    return results;
  }

  async findByDistributionAndInvestor(
    distributionId: DistributionId,
    investorId: string,
  ): Promise<DistributionRecipientAggregate | null> {
    const recipients = await this.findByDistributionId(distributionId);
    return recipients.find((r) => r.investorId === investorId) ?? null;
  }
}
