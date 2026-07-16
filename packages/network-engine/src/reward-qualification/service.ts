import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { RewardQualification } from "../types";
import { RewardType, RewardStatus, Rank } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, RewardError } from "../errors";

export interface RewardCriteria {
  readonly minMonthlyVolume?: bigint;
  readonly minQuarterlyVolume?: bigint;
  readonly minRank?: Rank;
  readonly minTeamSize?: number;
  readonly minRecruited?: number;
  readonly minActiveLegs?: number;
}

export class RewardQualificationEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  checkQualification(actorId: EntityId, agentId: EntityId, rewardType: RewardType): RewardQualification {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const qualifies = this.evaluateCriteria(agent, rewardType);

    if (!qualifies) throw new RewardError(`Agent ${agentId} does not qualify for ${rewardType}`);

    const qualification: RewardQualification = {
      id: generateId("rewqual") as EntityId,
      agentId,
      rewardType,
      status: RewardStatus.Qualified,
      qualifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveRewardQualification(qualification);

    publishNetworkEvent(this.events, NetworkEventType.RewardQualified, qualification.id, actorId, {
      qualificationId: qualification.id as string,
      agentId: agentId as string,
      rewardType,
    });

    return qualification;
  }

  listByAgent(agentId: EntityId): RewardQualification[] {
    return this.repository.listRewardsByAgent(agentId);
  }

  private evaluateCriteria(agent: { rank: Rank; monthlyVolume: bigint; recruitmentCount: number }, rewardType: RewardType): boolean {
    switch (rewardType) {
      case RewardType.MonthlyBonus:
        return agent.monthlyVolume >= 50000n;
      case RewardType.QuarterlyBonus:
        return agent.rank !== Rank.Associate && agent.monthlyVolume >= 100000n;
      case RewardType.LuxuryRewards:
        return agent.rank === Rank.Diamond || agent.rank === Rank.Elite || agent.rank === Rank.Legend;
      case RewardType.RLKOReward:
        return agent.rank !== Rank.Associate && agent.monthlyVolume >= 25000n;
      case RewardType.NFTBadge:
        return agent.recruitmentCount >= 5;
      case RewardType.FeeDiscount:
        return agent.rank !== Rank.Associate;
      case RewardType.PropertyAllocation:
        return agent.rank === Rank.Platinum || agent.rank === Rank.Diamond || agent.rank === Rank.Elite || agent.rank === Rank.Legend;
      case RewardType.LeadershipReward:
        return agent.rank === Rank.Elite || agent.rank === Rank.Legend;
      default:
        return false;
    }
  }
}
