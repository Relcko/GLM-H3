import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { Proposal, GovernanceSearchQuery, GovernanceSearchResult } from "../types";

export class GovernanceSearch {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  search(actorId: EntityId, query: GovernanceSearchQuery): GovernanceSearchResult {
    const proposals = this.repository.listAllProposals();
    const filtered = this.filterByQuery(proposals, query);
    const sorted = this.sortResults(filtered, query.sort);
    const paginated = this.paginate(sorted, query.page ?? 1, query.pageSize ?? 20);

    this.logger?.info("governance search executed", { actorId, query: query.query, total: paginated.total });

    return paginated;
  }

  filterByQuery(proposals: Proposal[], query: GovernanceSearchQuery): Proposal[] {
    let result = [...proposals];

    if (query.query) {
      const lower = query.query.toLowerCase();
      result = result.filter(
        p => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower),
      );
    }

    if (query.category) {
      result = result.filter(p => p.category === query.category);
    }

    if (query.status) {
      result = result.filter(p => p.status === query.status);
    }

    if (query.proposerId) {
      result = result.filter(p => p.proposerId === query.proposerId);
    }

    if (query.dateFrom) {
      result = result.filter(p => p.createdAt >= query.dateFrom!);
    }

    if (query.dateTo) {
      result = result.filter(p => p.createdAt <= query.dateTo!);
    }

    return result;
  }

  sortResults(proposals: Proposal[], sort?: string): Proposal[] {
    const sorted = [...proposals];

    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "votes_desc":
        sorted.sort((a, b) => Number(b.forVotes + b.againstVotes + b.abstainVotes - (a.forVotes + a.againstVotes + a.abstainVotes)));
        break;
      case "votes_asc":
        sorted.sort((a, b) => Number(a.forVotes + a.againstVotes + a.abstainVotes - (b.forVotes + b.againstVotes + b.abstainVotes)));
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    return sorted;
  }

  paginate(proposals: Proposal[], page: number, pageSize: number): GovernanceSearchResult {
    const total = proposals.length;
    const start = (page - 1) * pageSize;
    const items = proposals.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }
}
