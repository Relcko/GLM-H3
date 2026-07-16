import { BaseAdvisor, type AdvisorServices } from "./base-advisor";

export class ComplianceAdvisor extends BaseAdvisor {
  readonly description = "Ensures all recommendations comply with regulatory requirements";

  constructor(services: AdvisorServices) {
    super("compliance", services);
  }

  protected buildTitle(query: string): string {
    return `Compliance Advisory: ${query.slice(0, 60)}`;
  }
}
