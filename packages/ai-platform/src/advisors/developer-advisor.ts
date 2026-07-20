import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class DeveloperAdvisor extends BaseAdvisor {
  readonly description = "Assists developers with platform integration, API usage, and technical guidance";

  constructor(services: AdvisorServices) {
    super("developer", services);
  }

  protected buildTitle(query: string): string {
    return `Developer Advisory: ${query.slice(0, 60)}`;
  }
}
