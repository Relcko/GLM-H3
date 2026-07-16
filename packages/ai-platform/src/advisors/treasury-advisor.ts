import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class TreasuryAdvisor extends BaseAdvisor {
  readonly description = "Offers treasury management guidance, respecting treasury policies and constraints";

  constructor(services: AdvisorServices) {
    super("treasury", services);
  }

  protected buildTitle(query: string): string {
    return `Treasury Advisory: ${query.slice(0, 60)}`;
  }
}
