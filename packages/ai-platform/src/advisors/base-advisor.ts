import type { Logger } from "@relcko/logging";
import type { EntityId } from "@relcko/types";
import type { AdvisorDomain, Recommendation, ContextEntry, ExplainabilityResult, AdvisoryAction, ModelProvider } from "../types";
import type { KnowledgeService } from "../knowledge/knowledge-service";
import type { MemoryService } from "../memory/memory-service";
import type { ContextBuilder } from "../context/context-builder";
import type { PromptBuilder } from "../prompt/prompt-builder";
import type { ExplainabilityEngine } from "../explainability/explainability-engine";
import type { RecommendationService } from "../recommendation/recommendation-service";
import type { ModelRouter } from "../model-router";
import type { PolicyEngine } from "../policy-engine";
import type { EventBus } from "@relcko/events";
import type { PerformanceModuleContext } from "@relcko/performance";

export interface AdvisorServices {
  readonly knowledgeService: KnowledgeService;
  readonly memoryService: MemoryService;
  readonly contextBuilder: ContextBuilder;
  readonly promptBuilder: PromptBuilder;
  readonly explainabilityEngine: ExplainabilityEngine;
  readonly recommendationService: RecommendationService;
  readonly modelRouter: ModelRouter;
  readonly policyEngine: PolicyEngine;
  readonly events: EventBus;
  readonly logger?: Logger;
  readonly defaultModelProvider?: ModelProvider;
  readonly performance?: PerformanceModuleContext;
}

export abstract class BaseAdvisor {
  constructor(
    protected readonly domain: AdvisorDomain,
    protected readonly services: AdvisorServices,
  ) {}

  abstract readonly description: string;

  async advise(
    actorId: EntityId,
    query: string,
    options?: {
      context?: Record<string, unknown>;
      modelProvider?: ModelProvider;
      maxTokens?: number;
      templateId?: string;
    },
  ): Promise<Recommendation> {
    const context = await this.services.contextBuilder.build({
      actorId,
      domain: this.domain,
      query,
      context: options?.context,
    });

    const modelRequest = await this.services.promptBuilder.build(actorId, {
      domain: this.domain,
      query,
      context,
      templateId: options?.templateId,
      maxTokens: options?.maxTokens,
    });

    const provider = options?.modelProvider ?? this.services.defaultModelProvider;
    const modelResult = provider
      ? await this.services.modelRouter.invoke(provider, modelRequest)
      : (await this.services.modelRouter.invokeBest(modelRequest)).response;
    const response = modelResult;

    const explainability = await this.services.explainabilityEngine.compute(actorId, {
      domain: this.domain,
      query,
      modelOutput: response.content,
      metadata: options?.context,
    });

    const policyResults = await this.services.policyEngine.evaluate(this.domain, {
      query,
      ...options?.context,
    });

    const hasDeny = policyResults.some(p => p.action === "deny");
    if (hasDeny) {
      throw new Error(`Advisory blocked by policy for domain ${this.domain}`);
    }

    const action = this.buildAction(query, options?.context);

    const recommendation = await this.services.recommendationService.create(actorId, {
      domain: this.domain,
      type: "advisory",
      title: this.buildTitle(query),
      description: response.content,
      priority: this.calculatePriority(explainability),
      explainability,
      action,
    });

    return recommendation;
  }

  protected abstract buildTitle(query: string): string;

  protected buildAction(_query: string, _context?: Record<string, unknown>): AdvisoryAction | undefined {
    return undefined;
  }

  protected calculatePriority(explainability: ExplainabilityResult): number {
    const base = Math.round(explainability.score * 10);
    if (explainability.risk.level === "critical") return base + 5;
    if (explainability.risk.level === "high") return base + 3;
    return base;
  }
}
