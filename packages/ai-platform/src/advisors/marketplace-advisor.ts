import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class MarketplaceAdvisor extends BaseAdvisor {
  readonly description = "Advises on property marketplace dynamics, pricing, and trends";

  constructor(services: AdvisorServices) {
    super("marketplace", services);
  }

  protected buildTitle(query: string): string {
    return `Marketplace Advisory: ${query.slice(0, 60)}`;
  }
}
