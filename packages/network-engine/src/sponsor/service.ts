import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { SponsorRelationship } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, DuplicateSponsorError, SelfSponsorError, CircularSponsorError } from "../errors";

export class SponsorService {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async link(actorId: EntityId, agentId: EntityId, sponsorId: EntityId): Promise<SponsorRelationship> {
    if (agentId === sponsorId) throw new SelfSponsorError();

    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const sponsor = this.repository.getAgent(sponsorId);
    if (!sponsor) throw new AgentNotFoundError(sponsorId as string);

    const existing = this.repository.getSponsorByAgent(agentId);
    if (existing) throw new DuplicateSponsorError(agentId as string);

    if (this.wouldCreateCycle(agentId, sponsorId)) throw new CircularSponsorError();

    const depth = this.calculateDepth(sponsorId) + 1;

    const relationship: SponsorRelationship = {
      id: generateId("sponsor") as EntityId,
      sponsorId,
      agentId,
      depth,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveSponsor(relationship);

    const updatedAgent = { ...agent, sponsorId, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updatedAgent);

    const updatedSponsor = { ...sponsor, recruitmentCount: sponsor.recruitmentCount + 1, updatedAt: new Date().toISOString() };
    this.repository.saveAgent(updatedSponsor);

    await publishNetworkEvent(this.events, NetworkEventType.SponsorLinked, relationship.id, actorId, {
      relationshipId: relationship.id as string,
      sponsorId: sponsorId as string,
      agentId: agentId as string,
      depth,
    });

    this.logger?.info("sponsor linked", { agentId, sponsorId, depth });

    return relationship;
  }

  getSponsor(agentId: EntityId): SponsorRelationship | undefined {
    return this.repository.getSponsorByAgent(agentId);
  }

  listDownline(sponsorId: EntityId): SponsorRelationship[] {
    return this.repository.listDownline(sponsorId);
  }

  private calculateDepth(agentId: EntityId): number {
    const sponsor = this.repository.getSponsorByAgent(agentId);
    return sponsor ? sponsor.depth : 0;
  }

  private wouldCreateCycle(agentId: EntityId, sponsorId: EntityId): boolean {
    let current: EntityId | undefined = sponsorId;
    while (current) {
      if (current === agentId) return true;
      const rel = this.repository.getSponsorByAgent(current);
      current = rel?.sponsorId;
    }
    return false;
  }
}
