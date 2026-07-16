import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { Proposal, ProposalCategory, ProposalStatus } from "../types";
import { ProposalStatus as ProposalStatusEnum } from "../types";
import { GovernanceEventType, publishGovernanceEvent } from "../events";
import { ProposalNotFoundError, GovernanceError } from "../errors";

export interface CreateProposalInput {
  readonly title: string;
  readonly description: string;
  readonly proposerId: EntityId;
  readonly category: ProposalCategory;
  readonly targetAddress?: string;
  readonly calldata?: string;
  readonly value?: { amount: bigint; currency: string };
  readonly startBlock: bigint;
  readonly endBlock: bigint;
  readonly executionDelay?: number;
}

export class ProposalService {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateProposalInput): Promise<Proposal> {
    const proposal: Proposal = {
      id: generateId("proposal") as EntityId,
      title: input.title,
      description: input.description,
      proposerId: input.proposerId,
      category: input.category,
      status: ProposalStatusEnum.Draft,
      targetAddress: input.targetAddress,
      calldata: input.calldata,
      value: input.value as Money | undefined,
      startBlock: input.startBlock,
      endBlock: input.endBlock,
      quorum: 0n,
      approvalThreshold: 0n,
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 0n,
      executionDelay: input.executionDelay ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveProposal(proposal);

    await publishGovernanceEvent(this.events, GovernanceEventType.ProposalCreated, proposal.id, actorId, {
      proposalId: proposal.id as string,
      title: proposal.title,
      category: proposal.category,
      proposerId: proposal.proposerId as string,
    });

    this.logger?.info("proposal created", { proposalId: proposal.id, title: proposal.title });

    return proposal;
  }

  async submit(actorId: EntityId, proposalId: EntityId): Promise<Proposal> {
    const proposal = this.getProposalOrThrow(proposalId);
    if (proposal.status !== ProposalStatusEnum.Draft) {
      throw new GovernanceError(
        `Cannot submit proposal ${proposalId} from status ${proposal.status}`,
        "INVALID_STATE_TRANSITION",
        { proposalId: proposalId as string, currentStatus: proposal.status },
      );
    }

    const updated: Proposal = { ...proposal, status: ProposalStatusEnum.Review, updatedAt: new Date().toISOString() };
    this.repository.saveProposal(updated);

    await publishGovernanceEvent(this.events, GovernanceEventType.ProposalSubmitted, proposalId, actorId, {
      proposalId: proposalId as string,
    });

    return updated;
  }

  async review(actorId: EntityId, proposalId: EntityId, approved: boolean): Promise<Proposal> {
    const proposal = this.getProposalOrThrow(proposalId);
    if (proposal.status !== ProposalStatusEnum.Review) {
      throw new GovernanceError(
        `Cannot review proposal ${proposalId} from status ${proposal.status}`,
        "INVALID_STATE_TRANSITION",
        { proposalId: proposalId as string, currentStatus: proposal.status },
      );
    }

    const newStatus = approved ? ProposalStatusEnum.Active : ProposalStatusEnum.Draft;
    const updated: Proposal = { ...proposal, status: newStatus, updatedAt: new Date().toISOString() };
    this.repository.saveProposal(updated);

    await publishGovernanceEvent(this.events, GovernanceEventType.ProposalReviewed, proposalId, actorId, {
      proposalId: proposalId as string,
      approved,
      newStatus,
    });

    return updated;
  }

  async cancel(actorId: EntityId, proposalId: EntityId): Promise<Proposal> {
    const proposal = this.getProposalOrThrow(proposalId);
    const updated: Proposal = { ...proposal, status: ProposalStatusEnum.Cancelled, updatedAt: new Date().toISOString() };
    this.repository.saveProposal(updated);

    await publishGovernanceEvent(this.events, GovernanceEventType.ProposalCancelled, proposalId, actorId, {
      proposalId: proposalId as string,
      previousStatus: proposal.status,
    });

    return updated;
  }

  get(proposalId: EntityId): Proposal | undefined {
    return this.repository.getProposal(proposalId);
  }

  listByProposer(proposerId: EntityId): Proposal[] {
    return this.repository.listProposalsByProposer(proposerId);
  }

  listByStatus(status: ProposalStatus): Proposal[] {
    return this.repository.listProposalsByStatus(status);
  }

  listByCategory(category: ProposalCategory): Proposal[] {
    return this.repository.listProposalsByCategory(category);
  }

  listActive(): Proposal[] {
    return this.repository.listActiveProposals();
  }

  private getProposalOrThrow(id: EntityId): Proposal {
    const p = this.repository.getProposal(id);
    if (!p) throw new ProposalNotFoundError(id as string);
    return p;
  }
}
