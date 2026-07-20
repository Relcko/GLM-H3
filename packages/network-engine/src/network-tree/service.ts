import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { NetworkTreeNode } from "../types";
import { ActiveStatusValue } from "../types";
import { AgentNotFoundError } from "../errors";

export class NetworkTreeEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly logger?: Logger,
  ) {}

  asyncBuildTree(agentId: EntityId): NetworkTreeNode {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const sponsorRel = this.repository.getSponsorByAgent(agentId);
    const children = this.repository.listSponsorsBySponsor(agentId);

    const childNodes = children.map(c => this.asyncBuildTree(c.agentId));
    const branchSize = childNodes.reduce((sum, c) => sum + 1 + c.branchSize, 0);
    const activeBranchCount = childNodes.filter(c => c.activeStatus === ActiveStatusValue.Qualified).length;
    const inactiveBranchCount = childNodes.filter(c => c.activeStatus !== ActiveStatusValue.Qualified).length;

    return {
      agentId,
      sponsorId: sponsorRel?.sponsorId,
      depth: sponsorRel?.depth ?? 0,
      rank: agent.rank,
      activeStatus: agent.activeStatus,
      children: childNodes,
      branchSize,
      activeBranchCount,
      inactiveBranchCount,
    };
  }

  getBranchSize(agentId: EntityId): number {
    const tree = this.asyncBuildTree(agentId);
    return tree.branchSize;
  }

  getActiveBranchCount(agentId: EntityId): number {
    const tree = this.asyncBuildTree(agentId);
    return tree.activeBranchCount;
  }

  getInactiveBranchCount(agentId: EntityId): number {
    const tree = this.asyncBuildTree(agentId);
    return tree.inactiveBranchCount;
  }
}
