import type { Json, Metadata } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const AiEventType = {
  RecommendationCreated: "ai.recommendation_created",
  RecommendationAccepted: "ai.recommendation_accepted",
  RecommendationDismissed: "ai.recommendation_dismissed",
  KnowledgeIngested: "ai.knowledge_ingested",
  KnowledgeInvalidated: "ai.knowledge_invalidated",
  MemoryStored: "ai.memory_stored",
  MemoryExpired: "ai.memory_expired",
  MemoryErased: "ai.memory_erased",
  ContextBuilt: "ai.context_built",
  PromptGenerated: "ai.prompt_generated",
  ModelInvoked: "ai.model_invoked",
  ModelResponseReceived: "ai.model_response_received",
  ModelError: "ai.model_error",
  ExplainabilityComputed: "ai.explainability_computed",
  AdvisoryAction: "ai.advisory_action",
  PolicyEvaluated: "ai.policy_evaluated",
  PolicyViolation: "ai.policy_violation",
  AnalyticsComputed: "ai.analytics_computed",
} as const;

export type AiEventType = (typeof AiEventType)[keyof typeof AiEventType];

export async function publishAiEvent(
  bus: EventBus,
  type: string,
  aggregateId: string,
  actorId: string,
  payload: Json,
  options?: { correlationId?: string; traceId?: string; idempotencyKey?: string; metadata?: Metadata },
): Promise<void> {
  const envelope = createEnvelope({
    type,
    aggregateId: aggregateId as never,
    actorId: actorId as never,
    payload,
    source: "relcko.ai",
    ...options,
  });
  await bus.publish(envelope);
}
