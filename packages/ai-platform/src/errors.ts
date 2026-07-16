import { ErrorCategory, RelckoError } from "@relcko/error";

export class AiPlatformError extends RelckoError {
  constructor(message: string, code = "AI_PLATFORM_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class ModelRouterError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "MODEL_ROUTER_ERROR", metadata);
  }
}

export class KnowledgeError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "KNOWLEDGE_ERROR", metadata);
  }
}

export class MemoryError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "MEMORY_ERROR", metadata);
  }
}

export class ContextError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CONTEXT_ERROR", metadata);
  }
}

export class PromptError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "PROMPT_ERROR", metadata);
  }
}

export class ExplainabilityError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "EXPLAINABILITY_ERROR", metadata);
  }
}

export class RecommendationError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RECOMMENDATION_ERROR", metadata);
  }
}

export class AdvisorError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ADVISOR_ERROR", metadata);
  }
}

export class PolicyError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "POLICY_ERROR", metadata);
  }
}

export class AnalyticsError extends AiPlatformError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "AI_ANALYTICS_ERROR", metadata);
  }
}

export { AnalyticsError as AiAnalyticsError };
