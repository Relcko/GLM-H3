import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { RankRecord, NetworkAgent } from "../types";
import { Rank, RANK_QUALIFICATIONS, rankIndex } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, RankError } from "../errors";
import { QualificationEngine } from "../qualification/service";

export class RankEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly qualification: QualificationEngine,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  evaluatePromotion(actorId: EntityId, agentId: EntityId): RankRecord[] {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const results = this.qualification.checkAllRankQualifications(agentId);
    const promotions: RankRecord[] = [];
    let currentRank = agent.rank;

    for (const result of results) {
      if (!result.qualified) continue;
      const targetIdx = rankIndex(result.rank);
      const currentIdx = rankIndex(currentRank);

      if (targetIdx > currentIdx) {
        currentRank = result.rank;

        const record: RankRecord = {
          id: generateId("rankrec") as EntityId,
          agentId,
          rank: result.rank,
          promotedAt: new Date().toISOString(),
          personalSalesRequired: RANK_QUALIFICATIONS[targetIdx].minPersonalSales,
          teamSalesRequired: RANK_QUALIFICATIONS[targetIdx].minTeamSales,
          recruitedRequired: RANK_QUALIFICATIONS[targetIdx].minRecruited,
          activeLegsRequired: RANK_QUALIFICATIONS[targetIdx].minActiveLegs,
          achieved: true,
          createdAt: new Date().toISOString(),
        };

        this.repository.saveRankRecord(record);
        promotions.push(record);

        const updatedAgent: NetworkAgent = { ...agent, rank: result.rank, updatedAt: new Date().toISOString() };
        this.repository.saveAgent(updatedAgent);

        publishNetworkEvent(this.events, NetworkEventType.RankPromoted, agentId, actorId, {
          agentId: agentId as string,
          previousRank: agent.rank,
          newRank: result.rank,
        });

        this.logger?.info("agent promoted", { agentId, previousRank: agent.rank, newRank: result.rank });
      }
    }

    return promotions;
  }

  getCurrentRank(agentId: EntityId): RankRecord | undefined {
    return this.repository.getRankRecord(agentId);
  }

  listByRank(rank: Rank): RankRecord[] {
    return this.repository.listRankRecordsByRank(rank);
  }
}
