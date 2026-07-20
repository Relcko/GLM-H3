import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { CustomerOwnership } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { CustomerNotFoundError, CustomerAlreadyOwnedError } from "../errors";

export class CustomerOwnershipService {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async assign(actorId: EntityId, investorId: EntityId, agentId: EntityId): Promise<CustomerOwnership> {
    const existing = this.repository.getCustomerOwnership(investorId);
    if (existing) throw new CustomerAlreadyOwnedError(investorId as string);

    const ownership: CustomerOwnership = {
      id: generateId("custown") as EntityId,
      investorId,
      agentId,
      permanent: true,
      assignedAt: new Date().toISOString(),
    };

    this.repository.saveCustomerOwnership(ownership);

    await publishNetworkEvent(this.events, NetworkEventType.CustomerAssigned, ownership.id, actorId, {
      ownershipId: ownership.id as string,
      investorId: investorId as string,
      agentId: agentId as string,
    });

    this.logger?.info("customer assigned", { investorId, agentId });

    return ownership;
  }

  async reassign(actorId: EntityId, investorId: EntityId, newAgentId: EntityId): Promise<CustomerOwnership> {
    const existing = this.repository.getCustomerOwnership(investorId);
    if (!existing) throw new CustomerNotFoundError(investorId as string);

    const updated: CustomerOwnership = {
      ...existing,
      agentId: newAgentId,
      modifiedAt: new Date().toISOString(),
      modifiedBy: actorId,
    };

    this.repository.saveCustomerOwnership(updated);

    await publishNetworkEvent(this.events, NetworkEventType.CustomerReassigned, updated.id, actorId, {
      ownershipId: updated.id as string,
      investorId: investorId as string,
      previousAgentId: existing.agentId as string,
      newAgentId: newAgentId as string,
    });

    return updated;
  }

  getOwnership(investorId: EntityId): CustomerOwnership | undefined {
    return this.repository.getCustomerOwnership(investorId);
  }

  listByAgent(agentId: EntityId): CustomerOwnership[] {
    return this.repository.listCustomersByAgent(agentId);
  }
}
