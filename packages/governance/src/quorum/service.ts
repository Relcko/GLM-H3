import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { GovernanceSnapshot, QuorumConfig } from "../types";
import { publishGovernanceEvent, GovernanceEventType } from "../events";
import { ProposalNotFoundError } from "../errors";

export class QuorumEngine {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  checkQuorum(actorId: EntityId, proposalId: EntityId): GovernanceSnapshot {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) throw new ProposalNotFoundError(proposalId as string);

    const config = this.repository.getQuorumConfig() ?? this.getDefaultConfig();
    const totalVotingPower = 100000n;
    const forVotes = proposal.forVotes;
    const againstVotes = proposal.againstVotes;
    const abstainVotes = proposal.abstainVotes;
    const participationRate =
      Number(forVotes + againstVotes + abstainVotes) / Number(totalVotingPower);
    const quorumMet = forVotes >= config.minQuorum;
    const approvalMet =
      forVotes + againstVotes > 0n
        ? (Number(forVotes) / (Number(forVotes) + Number(againstVotes))) * 100 >=
          config.approvalThreshold
        : false;

    const snapshot: GovernanceSnapshot = {
      id: generateId("govsnap") as EntityId,
      proposalId,
      totalVotingPower,
      forVotes,
      againstVotes,
      abstainVotes,
      quorumMet,
      approvalMet,
      participationRate,
      snapshotAt: new Date().toISOString(),
    };

    this.repository.saveSnapshot(snapshot);

    publishGovernanceEvent(this.events, GovernanceEventType.QuorumChecked, proposalId, actorId, {
      proposalId: proposalId as string,
      quorumMet,
      approvalMet,
      forVotes: forVotes.toString(),
      againstVotes: againstVotes.toString(),
      minQuorum: config.minQuorum.toString(),
    });

    this.logger?.info("quorum checked", {
      proposalId: proposalId as string,
      quorumMet,
      approvalMet,
    });

    return snapshot;
  }

  isQuorumMet(proposalId: EntityId): boolean {
    const snapshot = this.repository.getSnapshotByProposal(proposalId);
    return snapshot?.quorumMet ?? false;
  }

  isApprovalMet(proposalId: EntityId): boolean {
    const snapshot = this.repository.getSnapshotByProposal(proposalId);
    return snapshot?.approvalMet ?? false;
  }

  getDefaultConfig(): QuorumConfig {
    return {
      minQuorum: 10000n,
      approvalThreshold: 50,
      executionThreshold: 60,
      emergencyQuorum: 5000n,
      emergencyApprovalThreshold: 60,
      timeWindowDays: 7,
    };
  }

  configureQuorum(actorId: EntityId, config: QuorumConfig): void {
    this.repository.saveQuorumConfig(config);
    this.logger?.info("quorum configured", { config });
  }

  getQuorumConfig(): QuorumConfig | undefined {
    return this.repository.getQuorumConfig();
  }
}
