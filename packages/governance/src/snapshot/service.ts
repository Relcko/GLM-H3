import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { GovernanceSnapshot } from "../types";
import { publishGovernanceEvent, GovernanceEventType } from "../events";
import { ProposalNotFoundError, SnapshotNotFoundError } from "../errors";

export class GovernanceSnapshotEngine {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  createSnapshot(actorId: EntityId, proposalId: EntityId): GovernanceSnapshot {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) throw new ProposalNotFoundError(proposalId as string);

    const totalVotingPower = 100000n;
    const forVotes = proposal.forVotes;
    const againstVotes = proposal.againstVotes;
    const abstainVotes = proposal.abstainVotes;
    const participationRate =
      Number(forVotes + againstVotes + abstainVotes) / Number(totalVotingPower);
    const quorumMet = forVotes + againstVotes + abstainVotes >= 10000n;
    const approvalMet =
      forVotes + againstVotes > 0n
        ? (Number(forVotes) / (Number(forVotes) + Number(againstVotes))) * 100 >= 50
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

    publishGovernanceEvent(
      this.events,
      GovernanceEventType.SnapshotCreated,
      snapshot.id,
      actorId,
      {
        snapshotId: snapshot.id as string,
        proposalId: proposalId as string,
      },
    );

    this.logger?.info("snapshot created", {
      snapshotId: snapshot.id as string,
      proposalId: proposalId as string,
    });

    return snapshot;
  }

  getSnapshot(id: EntityId): GovernanceSnapshot | undefined {
    return this.repository.getSnapshot(id);
  }

  getSnapshotByProposal(proposalId: EntityId): GovernanceSnapshot | undefined {
    return this.repository.getSnapshotByProposal(proposalId);
  }

  compareSnapshots(snapshotId1: EntityId, snapshotId2: EntityId): object {
    const snapshot1 = this.repository.getSnapshot(snapshotId1);
    if (!snapshot1) throw new SnapshotNotFoundError(snapshotId1 as string);

    const snapshot2 = this.repository.getSnapshot(snapshotId2);
    if (!snapshot2) throw new SnapshotNotFoundError(snapshotId2 as string);

    return {
      snapshot1: {
        id: snapshot1.id,
        proposalId: snapshot1.proposalId,
        forVotes: snapshot1.forVotes,
        againstVotes: snapshot1.againstVotes,
        abstainVotes: snapshot1.abstainVotes,
        totalVotingPower: snapshot1.totalVotingPower,
        quorumMet: snapshot1.quorumMet,
        approvalMet: snapshot1.approvalMet,
        participationRate: snapshot1.participationRate,
      },
      snapshot2: {
        id: snapshot2.id,
        proposalId: snapshot2.proposalId,
        forVotes: snapshot2.forVotes,
        againstVotes: snapshot2.againstVotes,
        abstainVotes: snapshot2.abstainVotes,
        totalVotingPower: snapshot2.totalVotingPower,
        quorumMet: snapshot2.quorumMet,
        approvalMet: snapshot2.approvalMet,
        participationRate: snapshot2.participationRate,
      },
      differences: {
        forVotesDelta: snapshot2.forVotes - snapshot1.forVotes,
        againstVotesDelta: snapshot2.againstVotes - snapshot1.againstVotes,
        abstainVotesDelta: snapshot2.abstainVotes - snapshot1.abstainVotes,
        participationRateDelta: snapshot2.participationRate - snapshot1.participationRate,
        quorumChanged: snapshot1.quorumMet !== snapshot2.quorumMet,
        approvalChanged: snapshot1.approvalMet !== snapshot2.approvalMet,
      },
    };
  }
}
