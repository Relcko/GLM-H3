import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { AdvisorDomain, AiOrchestratorRequest, AiOrchestratorResponse, Recommendation, ModelProvider } from "./types";
import type { AdvisorServices } from "./advisors/base-advisor";
import { InvestorAdvisor } from "./advisors/investor-advisor";
import { AgentAdvisor } from "./advisors/agent-advisor";
import { MarketplaceAdvisor } from "./advisors/marketplace-advisor";
import { PortfolioAdvisor } from "./advisors/portfolio-advisor";
import { TreasuryAdvisor } from "./advisors/treasury-advisor";
import { GovernanceAdvisor } from "./advisors/governance-advisor";
import { ComplianceAdvisor } from "./advisors/compliance-advisor";
import { PropertyAdvisor } from "./advisors/property-advisor";
import { DeveloperAdvisor } from "./advisors/developer-advisor";
import { ExecutiveAdvisor } from "./advisors/executive-advisor";
import { SupportAdvisor } from "./advisors/support-advisor";
import type { BaseAdvisor } from "./advisors/base-advisor";

export class AiOrchestrator {
  private readonly advisors = new Map<AdvisorDomain, BaseAdvisor>();
  private readonly services: AdvisorServices;

  constructor(services: AdvisorServices) {
    this.services = services;
    this.registerDefaultAdvisors();
  }

  private registerDefaultAdvisors(): void {
    this.register(new InvestorAdvisor(this.services));
    this.register(new AgentAdvisor(this.services));
    this.register(new MarketplaceAdvisor(this.services));
    this.register(new PortfolioAdvisor(this.services));
    this.register(new TreasuryAdvisor(this.services));
    this.register(new GovernanceAdvisor(this.services));
    this.register(new ComplianceAdvisor(this.services));
    this.register(new PropertyAdvisor(this.services));
    this.register(new DeveloperAdvisor(this.services));
    this.register(new ExecutiveAdvisor(this.services));
    this.register(new SupportAdvisor(this.services));
  }

  register(advisor: BaseAdvisor): void {
    this.advisors.set(advisor["domain"], advisor);
  }

  getAdvisor(domain: AdvisorDomain): BaseAdvisor | undefined {
    return this.advisors.get(domain);
  }

  listAdvisors(): readonly { domain: AdvisorDomain; description: string }[] {
    return Array.from(this.advisors.entries()).map(([domain, advisor]) => ({
      domain,
      description: advisor.description,
    }));
  }

  async process(request: AiOrchestratorRequest): Promise<AiOrchestratorResponse> {
    const advisor = this.advisors.get(request.domain);
    if (!advisor) {
      throw new Error(`No advisor registered for domain: ${request.domain}`);
    }

    const recommendation = await advisor.advise(request.actorId, request.query, {
      context: request.context,
    });

    return {
      recommendation,
      context: [],
      memoryUsed: true,
      knowledgeUsed: true,
      modelInvoked: true,
    };
  }

  async advise(
    actorId: EntityId,
    domain: AdvisorDomain,
    query: string,
    options?: {
      context?: Record<string, unknown>;
      modelProvider?: ModelProvider;
      maxTokens?: number;
    },
  ): Promise<Recommendation> {
    return this.process({
      actorId,
      domain,
      query,
      context: options?.context,
    }).then(r => r.recommendation);
  }
}
