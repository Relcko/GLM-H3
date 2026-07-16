import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class PropertyAdvisor extends BaseAdvisor {
  readonly description = "Provides property-specific analysis, valuation insights, and due diligence guidance";

  constructor(services: AdvisorServices) {
    super("property", services);
  }

  protected buildTitle(query: string): string {
    return `Property Advisory: ${query.slice(0, 60)}`;
  }
}
