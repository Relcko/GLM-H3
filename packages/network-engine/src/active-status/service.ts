import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { ActiveStatusRecord, NetworkAgent } from "../types";
import { ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, ActiveStatusError } from "../errors";

export class ActiveStatusEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  evaluate(actorId: EntityId, agentId: EntityId): ActiveStatusRecord {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const qualifiedDirectSales = agent.personalSales;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const personalEligible = qualifiedDirectSales > 0n;

    const downline = this.getDownlineIds(agentId);
    const teamEligible = downline.some(id => {
      const a = this.repository.getAgent(id);
      return a && a.activeStatus === ActiveStatusValue.Qualified;
    });

    let status: ActiveStatusValue;
    if (personalEligible || teamEligible) {
      status = ActiveStatusValue.Qualified;
    } else if (agent.activeStatus === ActiveStatusValue.Qualified) {
      status = ActiveStatusValue.AtRisk;
    } else {
      status = ActiveStatusValue.Lapsed;
    }

    const record: ActiveStatusRecord = {
      id: generateId("actstatus") as EntityId,
      agentId,
      status,
      qualifiedDirectSales,
      rollingWindowStart: windowStart.toISOString(),
      rollingWindowEnd: now.toISOString(),
      personalEligible,
      teamEligible,
      lastCheckAt: now.toISOString(),
      expiresAt: status === ActiveStatusValue.Lapsed ? now.toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveActiveStatus(record);

    const updatedAgent: NetworkAgent = {
      ...agent,
      activeStatus: status,
      updatedAt: now.toISOString(),
      ...(status === ActiveStatusValue.Qualified ? { activeWindowStart: windowStart.toISOString() } : {}),
    };
    this.repository.saveAgent(updatedAgent);

    if (agent.activeStatus !== status) {
      const eventType = status === ActiveStatusValue.Qualified
        ? NetworkEventType.ActiveStatusReactivated
        : status === ActiveStatusValue.Lapsed
          ? NetworkEventType.ActiveStatusExpired
          : NetworkEventType.ActiveStatusChanged;

      publishNetworkEvent(this.events, eventType, agentId, actorId, {
        agentId: agentId as string,
        previousStatus: agent.activeStatus,
        newStatus: status,
      });
    }

    this.logger?.info("active status evaluated", { agentId, status });

    return record;
  }

  getStatus(agentId: EntityId): ActiveStatusRecord | undefined {
    return this.repository.getActiveStatus(agentId);
  }

  isActive(agentId: EntityId): boolean {
    const status = this.repository.getActiveStatus(agentId);
    return status?.status === ActiveStatusValue.Qualified;
  }

  private getDownlineIds(agentId: EntityId): EntityId[] {
    const direct = this.repository.listSponsorsBySponsor(agentId);
    const ids: EntityId[] = [];
    for (const d of direct) {
      ids.push(d.agentId);
      ids.push(...this.getDownlineIds(d.agentId));
    }
    return ids;
  }
}
