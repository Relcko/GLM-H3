import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class PortfolioAdvisor extends BaseAdvisor {
  readonly description = "Provides portfolio analysis, diversification recommendations, and performance insights";

  constructor(services: AdvisorServices) {
    super("portfolio", services);
  }

  protected buildTitle(query: string): string {
    return `Portfolio Advisory: ${query.slice(0, 60)}`;
  }
}
