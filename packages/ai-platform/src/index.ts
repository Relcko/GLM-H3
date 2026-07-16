// Errors
export {
  AiPlatformError,
  ModelRouterError,
  KnowledgeError,
  MemoryError,
  ContextError,
  PromptError,
  ExplainabilityError,
  RecommendationError,
  PolicyError,
  AnalyticsError,
} from "./errors";

// Events
export { AiEventType, publishAiEvent } from "./events";

// Core Types
export type {
  AdvisorDomain,
  ModelProvider,
  ModelCapability,
  RiskLevel,
  RecommendationStatus,
  ConfidenceLevel,
  MemoryScope,
  KnowledgeType,
  ModelRequest,
  ModelResponse,
  ModelUsage,
  ModelAdapter,
  ContextEntry,
  KnowledgeEntry,
  MemoryEntry,
  ExplainabilityResult,
  EvidenceItem,
  Alternative,
  AffectedEntity,
  RiskAssessment,
  Recommendation,
  AdvisoryAction,
  AiAnalyticsEntry,
  PolicyRule,
  PolicyCondition,
  PolicyEvaluationResult,
  AiOrchestratorRequest,
  AiOrchestratorResponse,
} from "./types";

// Repository
export {
  InMemoryAiRepository,
} from "./repository";
export type {
  AiKnowledgeRepository,
  AiMemoryRepository,
  AiRecommendationRepository,
  AiAnalyticsRepository,
  AiPolicyRepository,
} from "./repository";

// Model Router
export { ModelRouter } from "./model-router";

// Knowledge
export { KnowledgeService } from "./knowledge/knowledge-service";

// Memory
export { MemoryService } from "./memory/memory-service";

// Context
export { ContextBuilder } from "./context/context-builder";
export type { ContextSource } from "./context/context-builder";

// Prompt
export { PromptBuilder } from "./prompt/prompt-builder";
export type { PromptTemplate } from "./prompt/prompt-builder";

// Explainability
export { ExplainabilityEngine } from "./explainability/explainability-engine";

// Recommendation
export { RecommendationService } from "./recommendation/recommendation-service";

// Policy
export { PolicyEngine } from "./policy-engine";

// Analytics
export { AnalyticsEngine } from "./analytics/analytics-engine";

// Event Adapter
export { EventAdapter } from "./event-adapter";
export type { DomainEventSubscription } from "./event-adapter";

// Base Advisor
export { BaseAdvisor } from "./advisors/base-advisor";
export type { AdvisorServices } from "./advisors/base-advisor";

// Advisors
export { InvestorAdvisor } from "./advisors/investor-advisor";
export { AgentAdvisor } from "./advisors/agent-advisor";
export { MarketplaceAdvisor } from "./advisors/marketplace-advisor";
export { PortfolioAdvisor } from "./advisors/portfolio-advisor";
export { TreasuryAdvisor } from "./advisors/treasury-advisor";
export { GovernanceAdvisor } from "./advisors/governance-advisor";
export { ComplianceAdvisor } from "./advisors/compliance-advisor";
export { PropertyAdvisor } from "./advisors/property-advisor";
export { DeveloperAdvisor } from "./advisors/developer-advisor";
export { ExecutiveAdvisor } from "./advisors/executive-advisor";
export { SupportAdvisor } from "./advisors/support-advisor";

// Orchestrator
export { AiOrchestrator } from "./orchestrator";

// System
export { SYSTEM_ACTOR_ID } from "./system-actor";
