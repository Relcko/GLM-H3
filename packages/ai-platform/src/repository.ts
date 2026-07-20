import type { KnowledgeEntry, KnowledgeType, MemoryEntry, MemoryScope, Recommendation, RecommendationStatus, AdvisorDomain, AiAnalyticsEntry, PolicyRule } from "./types";
import type { EntityId } from "@relcko/types";

export interface AiKnowledgeRepository {
  saveKnowledge(entry: KnowledgeEntry): void;
  getKnowledge(id: EntityId): KnowledgeEntry | undefined;
  getKnowledgeByKey(domain: string, key: string): KnowledgeEntry | undefined;
  getKnowledgeByDomain(domain: string): KnowledgeEntry[];
  getKnowledgeByType(type: KnowledgeType): KnowledgeEntry[];
  searchKnowledge(query: { domain?: string; type?: KnowledgeType; tags?: readonly string[]; minConfidence?: number }): KnowledgeEntry[];
  deleteKnowledge(id: EntityId): void;
}

export interface AiMemoryRepository {
  saveMemory(entry: MemoryEntry): void;
  getMemory(id: EntityId): MemoryEntry | undefined;
  getMemoryByKey(scope: MemoryScope, scopeId: EntityId, key: string): MemoryEntry | undefined;
  searchMemory(params: { scope?: MemoryScope; scopeId?: EntityId; keys?: readonly string[]; minPriority?: number }): MemoryEntry[];
  deleteMemory(id: EntityId): void;
  deleteMemoryByScope(scope: MemoryScope, scopeId: EntityId): void;
}

export interface AiRecommendationRepository {
  saveRecommendation(rec: Recommendation): void;
  getRecommendation(id: EntityId): Recommendation | undefined;
  searchRecommendations(params: { domain?: AdvisorDomain; status?: RecommendationStatus; minPriority?: number; requireReview?: boolean; limit?: number }): Recommendation[];
  getRecommendationsByDomain(domain: AdvisorDomain): Recommendation[];
  getRecommendationsByActor(actorId: EntityId): Recommendation[];
}

export interface AiAnalyticsRepository {
  saveAnalytics(entry: AiAnalyticsEntry): void;
  getAnalytics(id: EntityId): AiAnalyticsEntry | undefined;
  searchAnalytics(params: { period?: string; from?: string; to?: string }): AiAnalyticsEntry[];
}

export interface AiPolicyRepository {
  saveRule(rule: PolicyRule): void;
  getRule(id: EntityId): PolicyRule | undefined;
  getRulesByDomain(domain: AdvisorDomain): PolicyRule[];
  searchRules(params: { domain?: AdvisorDomain; activeOnly?: boolean }): PolicyRule[];
  deleteRule(id: EntityId): void;
}

export class InMemoryAiRepository implements AiKnowledgeRepository, AiMemoryRepository, AiRecommendationRepository, AiAnalyticsRepository, AiPolicyRepository {
  private readonly knowledge = new Map<string, KnowledgeEntry>();
  private readonly memories = new Map<string, MemoryEntry>();
  private readonly recommendations = new Map<string, Recommendation>();
  private readonly analytics = new Map<string, AiAnalyticsEntry>();
  private readonly policies = new Map<string, PolicyRule>();

  private readonly knowledgeByKey = new Map<string, string>();
  private readonly memoryByKey = new Map<string, string>();

  // Knowledge
  saveKnowledge(entry: KnowledgeEntry): void {
    this.knowledge.set(entry.id, entry);
    this.knowledgeByKey.set(`${entry.domain}:${entry.key}`, entry.id);
  }

  getKnowledge(id: EntityId): KnowledgeEntry | undefined {
    return this.knowledge.get(id);
  }

  getKnowledgeByKey(domain: string, key: string): KnowledgeEntry | undefined {
    const id = this.knowledgeByKey.get(`${domain}:${key}`);
    return id ? this.knowledge.get(id) : undefined;
  }

  getKnowledgeByDomain(domain: string): KnowledgeEntry[] {
    return Array.from(this.knowledge.values()).filter(k => k.domain === domain);
  }

  getKnowledgeByType(type: KnowledgeType): KnowledgeEntry[] {
    return Array.from(this.knowledge.values()).filter(k => k.type === type);
  }

  searchKnowledge(query: { domain?: string; type?: KnowledgeType; tags?: readonly string[]; minConfidence?: number }): KnowledgeEntry[] {
    return Array.from(this.knowledge.values()).filter(k => {
      if (query.domain && k.domain !== query.domain) return false;
      if (query.type && k.type !== query.type) return false;
      if (query.tags?.length && !query.tags.some(t => k.tags.includes(t))) return false;
      if (query.minConfidence !== undefined && k.confidence < query.minConfidence) return false;
      return true;
    });
  }

  deleteKnowledge(id: EntityId): void {
    const entry = this.knowledge.get(id);
    if (entry) {
      this.knowledgeByKey.delete(`${entry.domain}:${entry.key}`);
      this.knowledge.delete(id);
    }
  }

  // Memory
  saveMemory(entry: MemoryEntry): void {
    this.memories.set(entry.id, entry);
    this.memoryByKey.set(`${entry.scope}:${entry.scopeId}:${entry.key}`, entry.id);
  }

  getMemory(id: EntityId): MemoryEntry | undefined {
    return this.memories.get(id);
  }

  getMemoryByKey(scope: MemoryScope, scopeId: EntityId, key: string): MemoryEntry | undefined {
    const id = this.memoryByKey.get(`${scope}:${scopeId}:${key}`);
    return id ? this.memories.get(id) : undefined;
  }

  searchMemory(params: { scope?: MemoryScope; scopeId?: EntityId; keys?: readonly string[]; minPriority?: number }): MemoryEntry[] {
    return Array.from(this.memories.values()).filter(m => {
      if (params.scope && m.scope !== params.scope) return false;
      if (params.scopeId && m.scopeId !== params.scopeId) return false;
      if (params.keys?.length && !params.keys.includes(m.key)) return false;
      if (params.minPriority !== undefined && m.priority < params.minPriority) return false;
      return true;
    });
  }

  deleteMemory(id: EntityId): void {
    const entry = this.memories.get(id);
    if (entry) {
      this.memoryByKey.delete(`${entry.scope}:${entry.scopeId}:${entry.key}`);
      this.memories.delete(id);
    }
  }

  deleteMemoryByScope(scope: MemoryScope, scopeId: EntityId): void {
    const toDelete = this.searchMemory({ scope, scopeId });
    for (const m of toDelete) {
      this.deleteMemory(m.id);
    }
  }

  // Recommendations
  saveRecommendation(rec: Recommendation): void {
    this.recommendations.set(rec.id, rec);
  }

  getRecommendation(id: EntityId): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  searchRecommendations(params: { domain?: AdvisorDomain; status?: RecommendationStatus; minPriority?: number; requireReview?: boolean; limit?: number }): Recommendation[] {
    let results = Array.from(this.recommendations.values()).filter(r => {
      if (params.domain && r.domain !== params.domain) return false;
      if (params.status && r.status !== params.status) return false;
      if (params.minPriority !== undefined && r.priority < params.minPriority) return false;
      if (params.requireReview && !r.explainability.requiresHumanReview) return false;
      return true;
    });
    results.sort((a, b) => b.priority - a.priority);
    if (params.limit !== undefined) results = results.slice(0, params.limit);
    return results;
  }

  getRecommendationsByDomain(domain: AdvisorDomain): Recommendation[] {
    return this.searchRecommendations({ domain });
  }

  getRecommendationsByActor(_actorId: EntityId): Recommendation[] {
    return Array.from(this.recommendations.values());
  }

  // Analytics
  saveAnalytics(entry: AiAnalyticsEntry): void {
    this.analytics.set(entry.id, entry);
  }

  getAnalytics(id: EntityId): AiAnalyticsEntry | undefined {
    return this.analytics.get(id);
  }

  searchAnalytics(params: { period?: string; from?: string; to?: string }): AiAnalyticsEntry[] {
    return Array.from(this.analytics.values()).filter(a => {
      if (params.period && a.period !== params.period) return false;
      if (params.from && a.computedAt < params.from) return false;
      if (params.to && a.computedAt > params.to) return false;
      return true;
    });
  }

  // Policies
  saveRule(rule: PolicyRule): void {
    this.policies.set(rule.id, rule);
  }

  getRule(id: EntityId): PolicyRule | undefined {
    return this.policies.get(id);
  }

  getRulesByDomain(domain: AdvisorDomain): PolicyRule[] {
    return this.searchRules({ domain, activeOnly: true });
  }

  searchRules(params: { domain?: AdvisorDomain; activeOnly?: boolean }): PolicyRule[] {
    return Array.from(this.policies.values()).filter(r => {
      if (params.domain && r.domain !== params.domain) return false;
      if (params.activeOnly && !r.active) return false;
      return true;
    });
  }

  deleteRule(id: EntityId): void {
    this.policies.delete(id);
  }
}
