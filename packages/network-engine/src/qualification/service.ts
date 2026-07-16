import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { NetworkAgent } from "../types";
import { Rank, RANK_QUALIFICATIONS, rankIndex } from "../types";
import { AgentNotFoundError, QualificationError } from "../errors";
import { TreeTraversalEngine } from "../tree-traversal/service";

export interface QualificationResult {
  readonly rank: Rank;
  readonly qualified: boolean;
  readonly reasons: readonly string[];
  readonly personalSalesMet: boolean;
  readonly teamSalesMet: boolean;
  readonly recruitedMet: boolean;
  readonly activeLegsMet: boolean;
}

export class QualificationEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly traversal: TreeTraversalEngine,
    private readonly logger?: Logger,
  ) {}

  checkRankQualification(agentId: EntityId, targetRank: Rank): QualificationResult {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const q = RANK_QUALIFICATIONS.find(r => r.rank === targetRank);
    if (!q) throw new QualificationError(`Unknown rank: ${targetRank}`);

    const currentRankIdx = rankIndex(agent.rank);
    const targetRankIdx = rankIndex(targetRank);

    if (targetRankIdx <= currentRankIdx) {
      return {
        rank: targetRank,
        qualified: true,
        reasons: [],
        personalSalesMet: true,
        teamSalesMet: true,
        recruitedMet: true,
        activeLegsMet: true,
      };
    }

    const personalSalesMet = agent.personalSales >= q.minPersonalSales;
    const teamSalesMet = agent.teamSales >= q.minTeamSales;
    const recruitedMet = agent.recruitmentCount >= q.minRecruited;

    const downline = this.traversal.getDownline(agentId);
    const activeLegs = new Set<EntityId>();
    for (const d of downline) {
      if (d.active) activeLegs.add(d.agentId);
    }
    const activeLegsMet = activeLegs.size >= q.minActiveLegs;

    const reasons: string[] = [];
    if (!personalSalesMet) reasons.push(`Personal sales ${agent.personalSales} < ${q.minPersonalSales}`);
    if (!teamSalesMet) reasons.push(`Team sales ${agent.teamSales} < ${q.minTeamSales}`);
    if (!recruitedMet) reasons.push(`Recruited ${agent.recruitmentCount} < ${q.minRecruited}`);
    if (!activeLegsMet) reasons.push(`Active legs ${activeLegs.size} < ${q.minActiveLegs}`);

    const qualified = personalSalesMet && teamSalesMet && recruitedMet && activeLegsMet;

    return {
      rank: targetRank,
      qualified,
      reasons,
      personalSalesMet,
      teamSalesMet,
      recruitedMet,
      activeLegsMet,
    };
  }

  checkAllRankQualifications(agentId: EntityId): QualificationResult[] {
    return RANK_QUALIFICATIONS.map(q => this.checkRankQualification(agentId, q.rank));
  }
}
