import type { EntityId, Json } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { AdvisorDomain, ContextEntry, ModelRequest, ModelCapability } from "../types";
import { AiEventType, publishAiEvent } from "../events";
import { PromptError } from "../errors";

export interface PromptTemplate {
  readonly id: string;
  readonly domain: AdvisorDomain;
  readonly version: string;
  readonly systemPrompt: string;
  readonly userPromptTemplate: string;
  readonly capabilities: readonly ModelCapability[];
}

export class PromptBuilder {
  private readonly templates = new Map<string, PromptTemplate>();

  constructor(
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  registerTemplate(template: PromptTemplate): void {
    const key = `${template.domain}:${template.id}`;
    this.templates.set(key, template);
    this.logger?.info("prompt template registered", { domain: template.domain, id: template.id });
  }

  getTemplate(domain: AdvisorDomain, id: string): PromptTemplate | undefined {
    return this.templates.get(`${domain}:${id}`);
  }

  async build(
    actorId: EntityId,
    params: {
      domain: AdvisorDomain;
      query: string;
      context: readonly ContextEntry[];
      templateId?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<ModelRequest> {
    const template = params.templateId
      ? this.templates.get(`${params.domain}:${params.templateId}`)
      : undefined;

    if (params.templateId && !template) {
      throw new PromptError(`Prompt template not found: ${params.templateId} for domain ${params.domain}`);
    }

    const systemPrompt = params.systemPrompt ?? template?.systemPrompt ?? this.buildDefaultSystemPrompt(params.domain);
    const contextBlock = params.context.map(c => `[${c.source}]\n${c.content}`).join("\n\n");

    const userPrompt = template
      ? template.userPromptTemplate.replace("{{query}}", params.query).replace("{{context}}", contextBlock)
      : this.buildDefaultUserPrompt(params.query, contextBlock, params.domain);

    const capabilities = template?.capabilities ?? ["chat", "reasoning"];

    try {
      await publishAiEvent(this.events, AiEventType.PromptGenerated, actorId, actorId, {
        domain: params.domain,
        templateId: params.templateId,
        contextLength: params.context.length,
        capabilities,
      } as unknown as Json);
    } catch (error) {
      this.logger?.warn("failed to publish prompt generated event", { error: String(error) });
    }

    return {
      prompt: userPrompt,
      systemPrompt,
      capabilities,
      maxTokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      context: [...params.context],
    };
  }

  private buildDefaultSystemPrompt(domain: AdvisorDomain): string {
    const base = "You are an AI advisor for the Relcko real estate investment platform.";
    const domainTips: Record<AdvisorDomain, string> = {
      investor: "You help investors make informed decisions about real estate investments.",
      agent: "You assist agents in managing their network, referrals, and commissions.",
      marketplace: "You advise on property marketplace dynamics, pricing, and trends.",
      portfolio: "You provide portfolio analysis, diversification recommendations, and performance insights.",
      treasury: "You offer treasury management guidance, respecting treasury policies and constraints.",
      governance: "You explain governance proposals, voting mechanisms, and delegation strategies.",
      compliance: "You ensure all recommendations comply with regulatory requirements.",
      property: "You provide property-specific analysis, valuation insights, and due diligence guidance.",
      developer: "You assist developers with platform integration, API usage, and technical guidance.",
      executive: "You deliver strategic insights, platform-wide analytics, and high-level recommendations.",
      support: "You help users troubleshoot issues and navigate the platform.",
    };
    return `${base}\n${domainTips[domain] ?? ""}\nYou provide advisory recommendations only. You never execute financial actions. All recommendations include confidence levels, evidence, and reasoning.`;
  }

  private buildDefaultUserPrompt(query: string, contextBlock: string, _domain: AdvisorDomain): string {
    return `Context:\n${contextBlock}\n\nQuery: ${query}\n\nProvide a clear advisory recommendation with reasoning.`;
  }
}
