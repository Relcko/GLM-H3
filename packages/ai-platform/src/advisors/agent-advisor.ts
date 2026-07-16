import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class AgentAdvisor extends BaseAdvisor {
  readonly description = "Assists agents in managing network, referrals, and commissions";

  constructor(services: AdvisorServices) {
    super("agent", services);
  }

  protected buildTitle(query: string): string {
    return `Agent Advisory: ${query.slice(0, 60)}`;
  }
}
