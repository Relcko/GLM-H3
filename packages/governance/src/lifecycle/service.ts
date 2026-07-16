import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { Proposal, ProposalStatus } from "../types";
import { ProposalStatus as ProposalStatusEnum } from "../types";
import { GovernanceEventType, publishGovernanceEvent } from "../events";
import { ProposalNotFoundError, GovernanceError } from "../errors";

const ALLOWED_TRANSITIONS: ReadonlyMap<ProposalStatus, readonly ProposalStatus[]> = new Map([
  [ProposalStatusEnum.Draft, [ProposalStatusEnum.Review, ProposalStatusEnum.Cancelled]],
  [ProposalStatusEnum.Review, [ProposalStatusEnum.Active, ProposalStatusEnum.Draft, ProposalStatusEnum.Cancelled]],
  [ProposalStatusEnum.Active, [ProposalStatusEnum.Succeeded, ProposalStatusEnum.Defeated, ProposalStatusEnum.Expired, ProposalStatusEnum.Cancelled]],
  [ProposalStatusEnum.Succeeded, [ProposalStatusEnum.Executed, ProposalStatusEnum.Cancelled]],
  [ProposalStatusEnum.Defeated, [ProposalStatusEnum.Cancelled]],
  [ProposalStatusEnum.Cancelled, []],
  [ProposalStatusEnum.Executed, []],
  [ProposalStatusEnum.Expired, []],
]);

const TRANSITION_EVENTS: ReadonlyMap<ProposalStatus, string> = new Map([
  [ProposalStatusEnum.Active, GovernanceEventType.ProposalActivated],
  [ProposalStatusEnum.Succeeded, GovernanceEventType.ProposalSucceeded],
  [ProposalStatusEnum.Defeated, GovernanceEventType.ProposalDefeated],
  [ProposalStatusEnum.Executed, GovernanceEventType.ProposalExecuted],
  [ProposalStatusEnum.Cancelled, GovernanceEventType.ProposalCancelled],
  [ProposalStatusEnum.Expired, GovernanceEventType.ProposalExpired],
]);

export class ProposalLifecycleEngine {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async transition(actorId: EntityId, proposalId: EntityId, newStatus: ProposalStatus): Promise<Proposal> {
    const proposal = this.getProposalOrThrow(proposalId);

    if (!this.validateTransition(proposal.status, newStatus)) {
      throw new GovernanceError(
        `Cannot transition proposal ${proposalId} from ${proposal.status} to ${newStatus}`,
        "INVALID_STATE_TRANSITION",
        { proposalId: proposalId as string, currentStatus: proposal.status, targetStatus: newStatus },
      );
    }

    const updated: Proposal = { ...proposal, status: newStatus, updatedAt: new Date().toISOString() };
    this.repository.saveProposal(updated);

    const eventType = TRANSITION_EVENTS.get(newStatus);
    if (eventType) {
      await publishGovernanceEvent(this.events, eventType, proposalId, actorId, {
        proposalId: proposalId as string,
        previousStatus: proposal.status,
        newStatus,
      });
    }

    this.logger?.info("proposal status transitioned", {
      proposalId: proposalId as string,
      from: proposal.status,
      to: newStatus,
    });

    return updated;
  }

  validateTransition(current: ProposalStatus, target: ProposalStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS.get(current);
    return allowed ? allowed.includes(target) : false;
  }

  async expireProposals(actorId: EntityId): Promise<number> {
    const active = this.repository.listActiveProposals();
    const now = BigInt(Math.floor(Date.now() / 1000));
    const expired = active.filter((p) => p.endBlock <= now);

    for (const proposal of expired) {
      const updated: Proposal = { ...proposal, status: ProposalStatusEnum.Expired, updatedAt: new Date().toISOString() };
      this.repository.saveProposal(updated);

      await publishGovernanceEvent(this.events, GovernanceEventType.ProposalExpired, proposal.id, actorId, {
        proposalId: proposal.id as string,
      });
    }

    this.logger?.info("proposals expired", { count: expired.length });
    return expired.length;
  }

  async finalizeProposal(actorId: EntityId, proposalId: EntityId): Promise<Proposal> {
    const proposal = this.getProposalOrThrow(proposalId);
    if (proposal.status !== ProposalStatusEnum.Active) {
      throw new GovernanceError(
        `Cannot finalize proposal ${proposalId} in status ${proposal.status}`,
        "INVALID_STATE_TRANSITION",
        { proposalId: proposalId as string, currentStatus: proposal.status },
      );
    }

    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    const quorumMet = totalVotes >= proposal.quorum;
    const approvalMet = proposal.forVotes > proposal.againstVotes;

    if (!quorumMet) {
      throw new GovernanceError(
        `Quorum not met for proposal ${proposalId}`,
        "QUORUM_NOT_MET",
        { proposalId: proposalId as string, totalVotes: totalVotes.toString(), quorum: proposal.quorum.toString() },
      );
    }

    const newStatus = approvalMet ? ProposalStatusEnum.Succeeded : ProposalStatusEnum.Defeated;
    const eventType = approvalMet ? GovernanceEventType.ProposalSucceeded : GovernanceEventType.ProposalDefeated;
    const updated: Proposal = { ...proposal, status: newStatus, updatedAt: new Date().toISOString() };
    this.repository.saveProposal(updated);

    await publishGovernanceEvent(this.events, eventType, proposalId, actorId, {
      proposalId: proposalId as string,
      forVotes: proposal.forVotes.toString(),
      againstVotes: proposal.againstVotes.toString(),
      abstainVotes: proposal.abstainVotes.toString(),
      quorumMet,
      approvalMet,
    });

    return updated;
  }

  private getProposalOrThrow(id: EntityId): Proposal {
    const p = this.repository.getProposal(id);
    if (!p) throw new ProposalNotFoundError(id as string);
    return p;
  }
}
