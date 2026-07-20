import type { EntityId, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { AgentStatus } from "@relcko/domain-core";
import type { NetworkRepository } from "../repository";
import type { NetworkAgent } from "../types";
import { Rank, ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, AgentNotActiveError } from "../errors";

export class AgentRegistry {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  getAgent(id: EntityId): NetworkAgent {
    const a = this.repository.getAgent(id);
    if (!a) throw new AgentNotFoundError(id as string);
    return a;
  }

  getAgentByUserId(userId: EntityId): NetworkAgent | undefined {
    return this.repository.getAgentByUserId(userId);
  }

  getAgentByCode(code: string): NetworkAgent | undefined {
    return this.repository.getAgentByCode(code);
  }

  listActive(): NetworkAgent[] {
    return this.repository.listActiveAgents();
  }

  listByRank(rank: Rank): NetworkAgent[] {
    return this.repository.listAgentsByRank(rank);
  }

  assertActive(agentId: EntityId): void {
    const agent = this.getAgent(agentId);
    if (agent.status !== AgentStatus.Active) throw new AgentNotActiveError(agentId as string);
  }
}
