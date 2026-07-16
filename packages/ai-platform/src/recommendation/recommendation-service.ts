import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { Recommendation, RecommendationStatus, AdvisorDomain, ExplainabilityResult, AdvisoryAction } from "../types";
import { AiEventType, publishAiEvent } from "../events";
import { RecommendationError } from "../errors";
import type { AiRecommendationRepository } from "../repository";

export class RecommendationService {
  constructor(
    private readonly repository: AiRecommendationRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(
    actorId: EntityId,
    params: {
      domain: AdvisorDomain;
      type: string;
      title: string;
      description: string;
      priority: number;
      explainability: ExplainabilityResult;
      action?: AdvisoryAction;
    },
  ): Promise<Recommendation> {
    const now = new Date().toISOString();
    const recommendation: Recommendation = {
      id: generateId() as EntityId,
      domain: params.domain,
      type: params.type,
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: "pending",
      explainability: params.explainability,
      action: params.action,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveRecommendation(recommendation);

    await publishAiEvent(this.events, AiEventType.RecommendationCreated, recommendation.id, actorId, {
      recommendationId: recommendation.id,
      domain: params.domain,
      type: params.type,
      title: params.title,
      priority: params.priority,
      confidence: params.explainability.confidence,
      riskLevel: params.explainability.risk.level,
      requiresHumanReview: params.explainability.requiresHumanReview,
    });

    this.logger?.info("recommendation created", {
      id: recommendation.id,
      domain: params.domain,
      title: params.title,
    });

    return recommendation;
  }

  async accept(actorId: EntityId, id: EntityId): Promise<Recommendation> {
    const rec = this.repository.getRecommendation(id);
    if (!rec) throw new RecommendationError(`Recommendation ${id} not found`);
    if (rec.status !== "pending") throw new RecommendationError(`Cannot accept recommendation in status ${rec.status}`);

    const updated: Recommendation = { ...rec, status: "accepted" as RecommendationStatus, updatedAt: new Date().toISOString() };
    this.repository.saveRecommendation(updated);

    try {
      await publishAiEvent(this.events, AiEventType.RecommendationAccepted, id, actorId, {
        recommendationId: id,
        domain: rec.domain,
        title: rec.title,
      });
    } catch (error) {
      this.logger?.warn("failed to publish recommendation accepted event", { id, error: String(error) });
    }

    return updated;
  }

  async dismiss(actorId: EntityId, id: EntityId): Promise<Recommendation> {
    const rec = this.repository.getRecommendation(id);
    if (!rec) throw new RecommendationError(`Recommendation ${id} not found`);

    const updated: Recommendation = { ...rec, status: "dismissed" as RecommendationStatus, updatedAt: new Date().toISOString() };
    this.repository.saveRecommendation(updated);

    try {
      await publishAiEvent(this.events, AiEventType.RecommendationDismissed, id, actorId, {
        recommendationId: id,
        domain: rec.domain,
        title: rec.title,
      });
    } catch (error) {
      this.logger?.warn("failed to publish recommendation dismissed event", { id, error: String(error) });
    }

    return updated;
  }

  get(id: EntityId): Recommendation | undefined {
    return this.repository.getRecommendation(id);
  }

  search(params: {
    domain?: AdvisorDomain;
    status?: RecommendationStatus;
    minPriority?: number;
    requireReview?: boolean;
    limit?: number;
  }): Recommendation[] {
    return this.repository.searchRecommendations(params);
  }

  getByDomain(domain: AdvisorDomain): Recommendation[] {
    return this.repository.getRecommendationsByDomain(domain);
  }

  getByActor(actorId: EntityId): Recommendation[] {
    return this.repository.getRecommendationsByActor(actorId);
  }

  async expireOld(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const all = this.repository.searchRecommendations({});
    let count = 0;
    for (const rec of all) {
      if (rec.status === "pending" && new Date(rec.createdAt).getTime() < cutoff) {
        const updated: Recommendation = { ...rec, status: "expired" as RecommendationStatus, updatedAt: new Date().toISOString() };
        this.repository.saveRecommendation(updated);
        count++;
      }
    }
    return count;
  }
}
