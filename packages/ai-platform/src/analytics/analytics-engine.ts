import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { AiAnalyticsEntry, Recommendation } from "../types";
import { AiEventType, publishAiEvent } from "../events";
import type { AiRecommendationRepository, AiAnalyticsRepository } from "../repository";
import { SYSTEM_ACTOR_ID } from "../system-actor";

export class AnalyticsEngine {
  constructor(
    private readonly recommendationRepo: AiRecommendationRepository,
    private readonly analyticsRepo: AiAnalyticsRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async computePeriod(period: string): Promise<AiAnalyticsEntry> {
    const recommendations = this.recommendationRepo.searchRecommendations({});
    const pending = recommendations.filter(r => r.status === "pending");
    const accepted = recommendations.filter(r => r.status === "accepted");
    const dismissed = recommendations.filter(r => r.status === "dismissed");

    const domainCounts = new Map<string, number>();
    for (const r of recommendations) {
      domainCounts.set(r.domain, (domainCounts.get(r.domain) ?? 0) + 1);
    }

    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgConfidence = recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.explainability.score, 0) / recommendations.length
      : 0;

    const errorRate = recommendations.length > 0
      ? dismissed.length / recommendations.length
      : 0;

    const entry: AiAnalyticsEntry = {
      id: generateId() as EntityId,
      period,
      totalRecommendations: recommendations.length,
      acceptedRecommendations: accepted.length,
      dismissedRecommendations: dismissed.length,
      avgConfidence,
      topDomains,
      modelInvocations: recommendations.length,
      avgLatencyMs: 0,
      errorRate,
      computedAt: new Date().toISOString(),
    };

    this.analyticsRepo.saveAnalytics(entry);

    try {
      await publishAiEvent(this.events, AiEventType.AnalyticsComputed, entry.id, SYSTEM_ACTOR_ID, {
        analyticsId: entry.id,
        period,
        totalRecommendations: entry.totalRecommendations,
        acceptedRecommendations: entry.acceptedRecommendations,
      });
    } catch (error) {
      this.logger?.warn("failed to publish analytics computed event", { error: String(error) });
    }

    this.logger?.info("analytics computed", { period, total: entry.totalRecommendations });
    return entry;
  }

  get(id: EntityId): AiAnalyticsEntry | undefined {
    return this.analyticsRepo.getAnalytics(id);
  }

  search(params: { period?: string; from?: string; to?: string }): AiAnalyticsEntry[] {
    return this.analyticsRepo.searchAnalytics(params);
  }
}
