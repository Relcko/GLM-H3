import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class ExecutiveAdvisor extends BaseAdvisor {
  readonly description = "Delivers strategic insights, platform-wide analytics, and high-level recommendations";

  constructor(services: AdvisorServices) {
    super("executive", services);
  }

  protected buildTitle(query: string): string {
    return `Executive Advisory: ${query.slice(0, 60)}`;
  }
}
