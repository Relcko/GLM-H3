import type { EntityId, Money, Timestamp } from "@relcko/types";

export type AdvisorDomain =
  | "investor"
  | "agent"
  | "marketplace"
  | "portfolio"
  | "treasury"
  | "governance"
  | "compliance"
  | "property"
  | "developer"
  | "executive"
  | "support";

export type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "minimax" | "custom";

export type ModelCapability =
  | "chat"
  | "completion"
  | "embedding"
  | "reasoning"
  | "analysis"
  | "classification"
  | "extraction"
  | "summarization";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RecommendationStatus = "pending" | "accepted" | "dismissed" | "expired";

export type ConfidenceLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export type MemoryScope = "session" | "user" | "organization" | "global";

export type KnowledgeType = "structured" | "semantic" | "graph" | "document";

export interface ModelRequest {
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly capabilities: readonly ModelCapability[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stopSequences?: readonly string[];
  readonly context?: readonly ContextEntry[];
}

export interface ModelResponse {
  readonly content: string;
  readonly finishReason: string;
  readonly usage?: ModelUsage;
  readonly latencyMs: number;
}

export interface ModelUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ModelAdapter {
  readonly provider: ModelProvider;
  readonly capabilities: readonly ModelCapability[];
  invoke(request: ModelRequest): Promise<ModelResponse>;
  isAvailable(): boolean;
}

export interface ContextEntry {
  readonly source: string;
  readonly content: string;
  readonly priority: number;
  readonly metadata?: Record<string, unknown>;
}

export interface KnowledgeEntry {
  readonly id: EntityId;
  readonly type: KnowledgeType;
  readonly domain: string;
  readonly key: string;
  readonly value: unknown;
  readonly confidence: number;
  readonly evidence?: string;
  readonly provenance?: string;
  readonly version: number;
  readonly tags: readonly string[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface MemoryEntry {
  readonly id: EntityId;
  readonly scope: MemoryScope;
  readonly scopeId: EntityId;
  readonly key: string;
  readonly value: unknown;
  readonly priority: number;
  readonly retention: "volatile" | "persistent" | "critical";
  readonly expiresAt?: Timestamp;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface ExplainabilityResult {
  readonly recommendationId: EntityId;
  readonly confidence: ConfidenceLevel;
  readonly score: number;
  readonly evidence: readonly EvidenceItem[];
  readonly reasoning: string;
  readonly alternatives: readonly Alternative[];
  readonly affectedEntities: readonly AffectedEntity[];
  readonly risk: RiskAssessment;
  readonly sources: readonly string[];
  readonly requiresHumanReview: boolean;
  readonly computedAt: Timestamp;
}

export interface EvidenceItem {
  readonly source: string;
  readonly content: string;
  readonly relevance: number;
  readonly confidence: number;
}

export interface Alternative {
  readonly description: string;
  readonly impact: string;
  readonly risk: RiskLevel;
}

export interface AffectedEntity {
  readonly entityType: string;
  readonly entityId: EntityId;
  readonly impact: "positive" | "negative" | "neutral";
  readonly description: string;
}

export interface RiskAssessment {
  readonly level: RiskLevel;
  readonly score: number;
  readonly factors: readonly string[];
  readonly mitigation?: string;
}

export interface Recommendation {
  readonly id: EntityId;
  readonly domain: AdvisorDomain;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly priority: number;
  readonly status: RecommendationStatus;
  readonly explainability: ExplainabilityResult;
  readonly action?: AdvisoryAction;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface AdvisoryAction {
  readonly description: string;
  readonly domain: string;
  readonly actionType: string;
  readonly parameters: Record<string, unknown>;
  readonly requiresApproval: boolean;
  readonly requiresGovernance: boolean;
  readonly requiresTreasury: boolean;
}

export interface AiAnalyticsEntry {
  readonly id: EntityId;
  readonly period: string;
  readonly totalRecommendations: number;
  readonly acceptedRecommendations: number;
  readonly dismissedRecommendations: number;
  readonly avgConfidence: number;
  readonly topDomains: readonly { domain: string; count: number }[];
  readonly modelInvocations: number;
  readonly avgLatencyMs: number;
  readonly errorRate: number;
  readonly computedAt: Timestamp;
}

export interface PolicyRule {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly domain?: AdvisorDomain;
  readonly condition: PolicyCondition;
  readonly action: "allow" | "deny" | "flag" | "require_review";
  readonly priority: number;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface PolicyCondition {
  readonly field: string;
  readonly operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains" | "matches";
  readonly value: unknown;
}

export interface PolicyEvaluationResult {
  readonly rule: PolicyRule;
  readonly matched: boolean;
  readonly action: "allow" | "deny" | "flag" | "require_review";
  readonly reason?: string;
}

export interface AiOrchestratorRequest {
  readonly actorId: EntityId;
  readonly domain: AdvisorDomain;
  readonly query: string;
  readonly context?: Record<string, unknown>;
  readonly policies?: readonly string[];
}

export interface AiOrchestratorResponse {
  readonly recommendation: Recommendation;
  readonly context: readonly ContextEntry[];
  readonly memoryUsed: boolean;
  readonly knowledgeUsed: boolean;
  readonly modelInvoked: boolean;
}
