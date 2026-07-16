import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class InvestorAdvisor extends BaseAdvisor {
  readonly description = "Provides investment advisory recommendations for real estate investors";

  constructor(services: AdvisorServices) {
    super("investor", services);
  }

  protected buildTitle(query: string): string {
    return `Investment Advisory: ${query.slice(0, 60)}`;
  }
}
