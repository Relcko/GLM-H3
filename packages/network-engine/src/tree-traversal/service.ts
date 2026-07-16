import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { NetworkAgent } from "../types";
import { ActiveStatusValue } from "../types";
import { AgentNotFoundError, TreeTraversalError } from "../errors";

export interface UplineResult {
  readonly agentId: EntityId;
  readonly sponsorId: EntityId | undefined;
  readonly depth: number;
  readonly rank: string;
  readonly active: boolean;
}

export interface DownlineResult {
  readonly agentId: EntityId;
  readonly depth: number;
  readonly rank: string;
  readonly active: boolean;
  readonly personalSales: bigint;
  readonly teamSales: bigint;
}

export class TreeTraversalEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly logger?: Logger,
  ) {}

  getUpline(agentId: EntityId): UplineResult[] {
    const result: UplineResult[] = [];
    let current: EntityId | undefined = agentId;

    while (current) {
      const rel = this.repository.getSponsorByAgent(current);
      if (!rel) break;

      const agent = this.repository.getAgent(rel.sponsorId);
      if (!agent) break;

      result.push({
        agentId: rel.sponsorId,
        sponsorId: agent.sponsorId,
        depth: rel.depth - 1,
        rank: agent.rank,
        active: agent.activeStatus === ActiveStatusValue.Qualified,
      });

      current = rel.sponsorId;
    }

    return result;
  }

  getDownline(agentId: EntityId, maxDepth?: number): DownlineResult[] {
    const result: DownlineResult[] = [];
    const queue: Array<{ id: EntityId; depth: number }> = [{ id: agentId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (maxDepth !== undefined && current.depth >= maxDepth) continue;

      const children = this.repository.listSponsorsBySponsor(current.id);
      for (const child of children) {
        const agent = this.repository.getAgent(child.agentId);
        if (!agent) continue;

        result.push({
          agentId: child.agentId,
          depth: child.depth,
          rank: agent.rank,
          active: agent.activeStatus === ActiveStatusValue.Qualified,
          personalSales: agent.personalSales,
          teamSales: agent.teamSales,
        });

        queue.push({ id: child.agentId, depth: current.depth + 1 });
      }
    }

    return result;
  }

  getDepth(agentId: EntityId): number {
    const rel = this.repository.getSponsorByAgent(agentId);
    return rel?.depth ?? 0;
  }

  getTeamSize(agentId: EntityId): number {
    return this.getDownline(agentId).length;
  }

  getActiveTeamSize(agentId: EntityId): number {
    return this.getDownline(agentId).filter(d => d.active).length;
  }

  findNearestActiveUpline(agentId: EntityId): EntityId | undefined {
    const upline = this.getUpline(agentId);
    for (const u of upline) {
      if (u.active) return u.agentId;
    }
    return undefined;
  }

  compressUpline(agentId: EntityId): UplineResult[] {
    const fullUpline = this.getUpline(agentId);
    return fullUpline.filter(u => u.active);
  }
}
