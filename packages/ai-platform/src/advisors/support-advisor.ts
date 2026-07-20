import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class SupportAdvisor extends BaseAdvisor {
  readonly description = "Helps users troubleshoot issues and navigate the platform";

  constructor(services: AdvisorServices) {
    super("support", services);
  }

  protected buildTitle(query: string): string {
    return `Support Advisory: ${query.slice(0, 60)}`;
  }
}
