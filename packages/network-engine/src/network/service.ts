import type { EntityId, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { AgentStatus } from "@relcko/domain-core";
import type { NetworkRepository } from "../repository";
import type { NetworkAgent } from "../types";
import { Rank, ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError } from "../errors";

export interface RegisterAgentInput {
  userId: EntityId;
  code: string;
  currency: Currency;
  commissionRate?: number;
}

export class NetworkService {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async register(actorId: EntityId, input: RegisterAgentInput): Promise<NetworkAgent> {
    const agent: NetworkAgent = {
      id: generateId("netagent") as EntityId,
      userId: input.userId,
      code: input.code,
      status: AgentStatus.Pending,
      rank: Rank.Associate,
      activeStatus: ActiveStatusValue.Lapsed,
      commissionRate: input.commissionRate ?? 10,
      totalEarnings: { amount: 0n, currency: input.currency },
      withdrawnEarnings: { amount: 0n, currency: input.currency },
      personalSales: 0n,
      teamSales: 0n,
      monthlyVolume: 0n,
      lifetimeVolume: 0n,
      recruitmentCount: 0,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAgent(agent);

    await publishNetworkEvent(this.events, NetworkEventType.AgentRegistered, agent.id, actorId, {
      agentId: agent.id as string,
      userId: input.userId as string,
      code: agent.code,
    });

    this.logger?.info("agent registered", { agentId: agent.id, code: agent.code });
    return agent;
  }

  async activate(actorId: EntityId, agentId: EntityId): Promise<NetworkAgent> {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const updated: NetworkAgent = { ...agent, status: AgentStatus.Active, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updated);

    await publishNetworkEvent(this.events, NetworkEventType.AgentActivated, agentId, actorId, {
      agentId: agentId as string,
    });

    return updated;
  }

  async suspend(actorId: EntityId, agentId: EntityId): Promise<NetworkAgent> {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const updated: NetworkAgent = { ...agent, status: AgentStatus.Suspended, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updated);

    await publishNetworkEvent(this.events, NetworkEventType.AgentSuspended, agentId, actorId, {
      agentId: agentId as string,
    });

    return updated;
  }

  async terminate(actorId: EntityId, agentId: EntityId): Promise<NetworkAgent> {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const updated: NetworkAgent = { ...agent, status: AgentStatus.Terminated, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updated);

    await publishNetworkEvent(this.events, NetworkEventType.AgentTerminated, agentId, actorId, {
      agentId: agentId as string,
    });

    return updated;
  }

  async reactivate(actorId: EntityId, agentId: EntityId): Promise<NetworkAgent> {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const updated: NetworkAgent = { ...agent, status: AgentStatus.Active, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updated);

    await publishNetworkEvent(this.events, NetworkEventType.AgentReactivated, agentId, actorId, {
      agentId: agentId as string,
    });

    return updated;
  }
}
