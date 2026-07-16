import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class GovernanceAdvisor extends BaseAdvisor {
  readonly description = "Explains governance proposals, voting mechanisms, and delegation strategies";

  constructor(services: AdvisorServices) {
    super("governance", services);
  }

  protected buildTitle(query: string): string {
    return `Governance Advisory: ${query.slice(0, 60)}`;
  }
}
