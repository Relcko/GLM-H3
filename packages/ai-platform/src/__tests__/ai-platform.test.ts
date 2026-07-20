import { describe, expect, it, vi, beforeEach } from "vitest";
import {
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
  AiEventType,
  publishAiEvent,
  InMemoryAiRepository,
  ModelRouter,
  KnowledgeService,
  MemoryService,
  ContextBuilder,
  PromptBuilder,
  ExplainabilityEngine,
  RecommendationService,
  PolicyEngine,
  AnalyticsEngine,
  EventAdapter,
  AiOrchestrator,
} from "../index";
import { createEventBus, createEnvelope } from "@relcko/events";
import type { EntityId } from "@relcko/types";
import type { ModelAdapter, ModelResponse, ModelRequest } from "../types";
import type { BaseAdvisor } from "../advisors/base-advisor";
import type { AdvisorServices } from "../advisors/base-advisor";

// ---------------------------------------------------------------------------
// Stubs / helpers
// ---------------------------------------------------------------------------
const actorId = "actor_test_001" as EntityId;

function createServices() {
  const repo = new InMemoryAiRepository();
  const bus = createEventBus();
  const router = new ModelRouter();
  const logger = vi.fn() as any;
  logger.info = vi.fn();
  logger.warn = vi.fn();
  logger.error = vi.fn();

  const knowledge = new KnowledgeService(repo, bus, logger);
  const memory = new MemoryService(repo, bus, logger);
  const contextBuilder = new ContextBuilder(repo, repo, bus, logger);
  const promptBuilder = new PromptBuilder(bus, logger);
  const explainability = new ExplainabilityEngine(bus, logger);
  const recommendation = new RecommendationService(repo, bus, logger);
  const policyEngine = new PolicyEngine(repo, bus, logger);
  const analytics = new AnalyticsEngine(repo, repo, bus, logger);

  const services: AdvisorServices = {
    knowledgeService: knowledge,
    memoryService: memory,
    contextBuilder,
    promptBuilder,
    explainabilityEngine: explainability,
    recommendationService: recommendation,
    modelRouter: router,
    policyEngine,
    events: bus,
    logger,
  };

  return { repo, bus, router, knowledge, memory, contextBuilder, promptBuilder, explainability, recommendation, policyEngine, analytics, services, logger };
}

/** A fake model adapter that returns canned responses. */
function createFakeAdapter(
  content = "I recommend investing in property X with high confidence.\n\nReasoning: Strong market fundamentals.\n\nEvidence: Market data shows 15% growth.",
): ModelAdapter {
  return {
    provider: "openai",
    capabilities: ["chat", "reasoning", "analysis"],
    isAvailable: () => true,
    invoke: async (_req: ModelRequest): Promise<ModelResponse> => ({
      content,
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      latencyMs: 100,
    }),
  };
}

// ===========================================================================
// Error Hierarchy
// ===========================================================================
describe("error hierarchy", () => {
  it("AiPlatformError is base class", () => {
    const e = new AiPlatformError("generic");
    expect(e).toBeInstanceOf(AiPlatformError);
    expect(e.name).toBe("AiPlatformError");
  });

  it("subclasses inherit from AiPlatformError", () => {
    expect(new ModelRouterError("x")).toBeInstanceOf(AiPlatformError);
    expect(new KnowledgeError("x")).toBeInstanceOf(AiPlatformError);
    expect(new MemoryError("x")).toBeInstanceOf(AiPlatformError);
    expect(new ContextError("x")).toBeInstanceOf(AiPlatformError);
    expect(new PromptError("x")).toBeInstanceOf(AiPlatformError);
    expect(new ExplainabilityError("x")).toBeInstanceOf(AiPlatformError);
    expect(new RecommendationError("x")).toBeInstanceOf(AiPlatformError);
    expect(new PolicyError("x")).toBeInstanceOf(AiPlatformError);
    expect(new AnalyticsError("x")).toBeInstanceOf(AiPlatformError);
  });
});

// ===========================================================================
// Events
// ===========================================================================
describe("events", () => {
  it("AiEventType has expected canonical constants", () => {
    expect(AiEventType.RecommendationCreated).toBe("ai.recommendation_created");
    expect(AiEventType.RecommendationAccepted).toBe("ai.recommendation_accepted");
    expect(AiEventType.KnowledgeIngested).toBe("ai.knowledge_ingested");
    expect(AiEventType.ContextBuilt).toBe("ai.context_built");
    expect(AiEventType.ModelInvoked).toBe("ai.model_invoked");
  });

  it("publishAiEvent publishes to bus", async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.subscribe("ai.recommendation_created", handler);
    await publishAiEvent(bus, AiEventType.RecommendationCreated, "agg_1" as EntityId, actorId, { test: true });
    expect(handler).toHaveBeenCalledTimes(1);
    const envelope = handler.mock.calls[0][0];
    expect(envelope.type).toBe("ai.recommendation_created");
    expect(envelope.source).toBe("relcko.ai");
  });
});

// ===========================================================================
// Model Router
// ===========================================================================
describe("ModelRouter", () => {
  it("registers and lists adapters", () => {
    const router = new ModelRouter();
    const adapter = createFakeAdapter();
    router.register(adapter);
    expect(router.listProviders()).toEqual(["openai"]);
    expect(router.getAdapter("openai")).toBe(adapter);
  });

  it("invokes a registered adapter", async () => {
    const router = new ModelRouter();
    router.register(createFakeAdapter("test response"));
    const res = await router.invoke("openai", { prompt: "hello", capabilities: ["chat"] });
    expect(res.content).toBe("test response");
    expect(res.finishReason).toBe("stop");
  });

  it("throws ModelRouterError for unknown provider", async () => {
    const router = new ModelRouter();
    await expect(router.invoke("nope" as any, { prompt: "x", capabilities: [] })).rejects.toThrow(ModelRouterError);
  });

  it("invokeBest tries providers in order", async () => {
    const router = new ModelRouter();
    router.register(createFakeAdapter("best answer"));
    const { provider, response } = await router.invokeBest({ prompt: "hi", capabilities: ["chat"] });
    expect(provider).toBe("openai");
    expect(response.content).toBe("best answer");
  });

  it("unregister removes adapter", () => {
    const router = new ModelRouter();
    const adapter = createFakeAdapter();
    router.register(adapter);
    router.unregister("openai");
    expect(router.listProviders()).toEqual([]);
  });

  it("listCapabilities returns shape", () => {
    const router = new ModelRouter();
    router.register(createFakeAdapter());
    const caps = router.listCapabilities();
    expect(caps[0]).toMatchObject({ provider: "openai", capabilities: expect.arrayContaining(["chat", "reasoning"]) });
  });
});

// ===========================================================================
// Knowledge Service
// ===========================================================================
describe("KnowledgeService", () => {
  let svc: KnowledgeService;
  let bus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    const s = createServices();
    svc = s.knowledge;
    bus = s.bus;
  });

  it("ingests knowledge and retrieves by key", async () => {
    const entry = await svc.ingest(actorId, {
      domain: "marketplace",
      key: "avg_price",
      value: { price: 250000 },
      type: "structured",
      confidence: 0.9,
      tags: ["pricing"],
    });
    expect(entry.key).toBe("avg_price");
    expect(entry.confidence).toBe(0.9);
    expect(entry.version).toBe(1);

    const found = svc.getByKey("marketplace", "avg_price");
    expect(found).toBeDefined();
    expect(found!.id).toBe(entry.id);
  });

  it("increments version on re-ingest", async () => {
    await svc.ingest(actorId, { domain: "d", key: "k", value: 1, type: "structured", confidence: 0.5 });
    const v2 = await svc.ingest(actorId, { domain: "d", key: "k", value: 2, type: "structured", confidence: 0.6 });
    expect(v2.version).toBe(2);
  });

  it("search filters by confidence", async () => {
    await svc.ingest(actorId, { domain: "d", key: "k1", value: 1, type: "structured", confidence: 0.3 });
    await svc.ingest(actorId, { domain: "d", key: "k2", value: 2, type: "structured", confidence: 0.8 });
    const results = svc.search({ domain: "d", minConfidence: 0.7 });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("k2");
  });

  it("rejects invalid confidence", async () => {
    await expect(svc.ingest(actorId, { domain: "d", key: "k", value: 1, type: "structured", confidence: 1.5 })).rejects.toThrow(KnowledgeError);
  });

  it("invalidates knowledge", async () => {
    const e = await svc.ingest(actorId, { domain: "d", key: "k", value: 1, type: "structured", confidence: 0.5 });
    await svc.invalidate(actorId, e.id);
    expect(svc.get(e.id)).toBeUndefined();
  });
});

// ===========================================================================
// Memory Service
// ===========================================================================
describe("MemoryService", () => {
  let svc: MemoryService;

  beforeEach(() => {
    svc = createServices().memory;
  });

  it("stores and retrieves memory", async () => {
    const mem = await svc.store(actorId, { scope: "user", scopeId: actorId, key: "last_search", value: "condos", priority: 5 });
    expect(mem.key).toBe("last_search");

    const found = svc.getByKey("user", actorId, "last_search");
    expect(found).toBeDefined();
    expect(found!.id).toBe(mem.id);
  });

  it("sets expiration", async () => {
    const mem = await svc.store(actorId, { scope: "session", scopeId: actorId, key: "tmp", value: "data", ttlMs: 1000 });
    expect(mem.expiresAt).toBeDefined();
  });

  it("erases memory", async () => {
    const mem = await svc.store(actorId, { scope: "user", scopeId: actorId, key: "to_erase", value: "bye" });
    await svc.erase(actorId, mem.id);
    expect(svc.get(mem.id)).toBeUndefined();
  });

  it("prunes expired memory", async () => {
    // Use an already-expired timestamp by storing a memory with negative TTL
    await svc.store(actorId, { scope: "user", scopeId: actorId, key: "expired", value: "gone", ttlMs: -100000 });
    const count = await svc.pruneExpired();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("erases by scope", async () => {
    await svc.store(actorId, { scope: "user", scopeId: actorId, key: "a", value: 1 });
    await svc.store(actorId, { scope: "user", scopeId: actorId, key: "b", value: 2 });
    svc.eraseByScope("user", actorId);
    expect(svc.search({ scope: "user", scopeId: actorId })).toHaveLength(0);
  });
});

// ===========================================================================
// Context Builder
// ===========================================================================
describe("ContextBuilder", () => {
  it("builds context from knowledge and memory", async () => {
    const { contextBuilder, knowledge, memory } = createServices();
    await knowledge.ingest(actorId, { domain: "portfolio", key: "diversification", value: "Spread risk", type: "structured", confidence: 0.8 });
    await memory.store(actorId, { scope: "user", scopeId: actorId, key: "pref_risk", value: "moderate", priority: 3 });

    const ctx = await contextBuilder.build({ actorId, domain: "portfolio", query: "how to diversify?" });
    expect(ctx.length).toBeGreaterThanOrEqual(2);
  });

  it("includes external context sources", async () => {
    const { contextBuilder } = createServices();
    const source = {
      name: "external-api",
      priority: 10,
      fetch: async () => [{ source: "ext", content: "external data", priority: 10 }],
    };
    contextBuilder.registerSource(source);
    const ctx = await contextBuilder.build({ actorId, domain: "marketplace", query: "test" });
    expect(ctx.some(c => c.source === "ext")).toBe(true);
  });

  it("respects maxEntries", async () => {
    const { contextBuilder, knowledge } = createServices();
    for (let i = 0; i < 10; i++) {
      await knowledge.ingest(actorId, { domain: "investor", key: `k${i}`, value: i, type: "structured", confidence: 0.5 });
    }
    const ctx = await contextBuilder.build({ actorId, domain: "investor", query: "q", maxEntries: 3 });
    expect(ctx.length).toBeLessThanOrEqual(3);
  });
});

// ===========================================================================
// Prompt Builder
// ===========================================================================
describe("PromptBuilder", () => {
  it("builds a model request with default prompt", async () => {
    const { promptBuilder } = createServices();
    const req = await promptBuilder.build(actorId, {
      domain: "investor",
      query: "What should I invest in?",
      context: [{ source: "test", content: "Some context", priority: 1 }],
    });
    expect(req.prompt).toContain("What should I invest in?");
    expect(req.systemPrompt).toContain("Relcko");
    expect(req.capabilities).toContain("chat");
  });

  it("uses registered template", async () => {
    const { promptBuilder } = createServices();
    promptBuilder.registerTemplate({
      id: "test-template",
      domain: "investor",
      version: "1.0",
      systemPrompt: "Custom system",
      userPromptTemplate: "Query: {{query}}\nContext: {{context}}",
      capabilities: ["reasoning"],
    });
    const req = await promptBuilder.build(actorId, {
      domain: "investor",
      query: "test",
      context: [],
      templateId: "test-template",
    });
    expect(req.systemPrompt).toBe("Custom system");
    expect(req.prompt).toContain("Query: test");
  });

  it("throws on unknown template", async () => {
    const { promptBuilder } = createServices();
    await expect(promptBuilder.build(actorId, {
      domain: "investor",
      query: "test",
      context: [],
      templateId: "nonexistent",
    })).rejects.toThrow(PromptError);
  });
});

// ===========================================================================
// Explainability Engine
// ===========================================================================
describe("ExplainabilityEngine", () => {
  it("parses confidence from output", async () => {
    const { explainability } = createServices();
    const res = await explainability.compute(actorId, {
      domain: "portfolio",
      query: "test",
      modelOutput: "I recommend diversifying. high confidence. Reasoning: Market data. Evidence: data.",
    });
    expect(res.confidence).toBe("high");
    expect(res.score).toBeGreaterThan(0);
  });

  it("sets requiresHumanReview for high risk", async () => {
    const { explainability } = createServices();
    const res = await explainability.compute(actorId, {
      domain: "treasury",
      query: "risk",
      modelOutput: "This has high risk associated. Reasoning: volatile.",
    });
    expect(res.requiresHumanReview).toBe(true);
    expect(res.risk.level).toBe("high");
  });

  it("low risk does not require review", async () => {
    const { explainability } = createServices();
    const res = await explainability.compute(actorId, {
      domain: "marketplace",
      query: "low risk",
      modelOutput: "This is safe. low confidence. Reasoning: standard.",
    });
    expect(res.requiresHumanReview).toBe(false);
    expect(res.risk.level).toBe("low");
  });
});

// ===========================================================================
// Recommendation Service
// ===========================================================================
describe("RecommendationService", () => {
  let svc: RecommendationService;
  let repo: InMemoryAiRepository;
  let bus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    const s = createServices();
    svc = s.recommendation;
    repo = s.repo;
    bus = s.bus;
  });

  it("creates a recommendation", async () => {
    const rec = await svc.create(actorId, {
      domain: "investor",
      type: "advisory",
      title: "Invest in Property X",
      description: "A good opportunity",
      priority: 7,
      explainability: {
        recommendationId: "r_1" as EntityId,
        confidence: "high",
        score: 0.8,
        evidence: [],
        reasoning: "Market analysis",
        alternatives: [],
        affectedEntities: [],
        risk: { level: "low", score: 0.1, factors: [] },
        sources: ["test"],
        requiresHumanReview: false,
        computedAt: new Date().toISOString(),
      },
    });
    expect(rec.status).toBe("pending");
    expect(rec.domain).toBe("investor");
  });

  it("accepts a recommendation", async () => {
    const rec = await svc.create(actorId, { domain: "investor", type: "advisory", title: "T", description: "D", priority: 1, explainability: makeExplainability() });
    const accepted = await svc.accept(actorId, rec.id);
    expect(accepted.status).toBe("accepted");
  });

  it("dismisses a recommendation", async () => {
    const rec = await svc.create(actorId, { domain: "investor", type: "advisory", title: "T", description: "D", priority: 1, explainability: makeExplainability() });
    const dismissed = await svc.dismiss(actorId, rec.id);
    expect(dismissed.status).toBe("dismissed");
  });

  it("throws on accept non-pending", async () => {
    const rec = await svc.create(actorId, { domain: "investor", type: "advisory", title: "T", description: "D", priority: 1, explainability: makeExplainability() });
    await svc.dismiss(actorId, rec.id);
    await expect(svc.accept(actorId, rec.id)).rejects.toThrow(RecommendationError);
  });

  it("search filters by domain", async () => {
    await svc.create(actorId, { domain: "investor", type: "a", title: "A", description: "D", priority: 1, explainability: makeExplainability() });
    await svc.create(actorId, { domain: "treasury", type: "b", title: "B", description: "D", priority: 1, explainability: makeExplainability() });
    const results = svc.search({ domain: "treasury" });
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("treasury");
  });

  it("expireOld marks pending as expired", async () => {
    const oldRec = await svc.create(actorId, { domain: "investor", type: "a", title: "Old", description: "D", priority: 1, explainability: makeExplainability() });
    // Manually set createdAt far in the past by accessing the repo
    const stored = repo.getRecommendation(oldRec.id)!;
    repo.saveRecommendation({ ...stored, createdAt: new Date(Date.now() - 1_000_000).toISOString() });
    const count = await svc.expireOld(100_000);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(svc.get(oldRec.id)!.status).toBe("expired");
  });
});

function makeExplainability() {
  return {
    recommendationId: "r_temp" as EntityId,
    confidence: "medium" as const,
    score: 0.5,
    evidence: [],
    reasoning: "test",
    alternatives: [],
    affectedEntities: [],
    risk: { level: "low" as const, score: 0.1, factors: [] },
    sources: ["test"],
    requiresHumanReview: false,
    computedAt: new Date().toISOString(),
  };
}

// ===========================================================================
// Policy Engine
// ===========================================================================
describe("PolicyEngine", () => {
  let repo: InMemoryAiRepository;
  let engine: PolicyEngine;

  beforeEach(() => {
    const s = createServices();
    repo = s.repo;
    engine = s.policyEngine;
  });

  it("evaluates matching rules", async () => {
    repo.saveRule({
      id: "rule_1" as EntityId,
      name: "Deny large withdrawals",
      description: "Withdrawals over 100k need governance",
      domain: "treasury",
      condition: { field: "amount", operator: "gt", value: 100000 },
      action: "deny",
      priority: 10,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("treasury", { amount: 200000 });
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("deny");
    expect(results[0].matched).toBe(true);
  });

  it("returns empty for non-matching rules", async () => {
    repo.saveRule({
      id: "rule_2" as EntityId,
      name: "Limit",
      description: "test",
      domain: "marketplace",
      condition: { field: "count", operator: "lt", value: 10 },
      action: "flag",
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("marketplace", { count: 20 });
    expect(results).toHaveLength(0);
  });

  it("matches operator evaluates valid regex patterns", async () => {
    repo.saveRule({
      id: "rule_3" as EntityId,
      name: "Regex match",
      description: "Matches user agent pattern",
      domain: "compliance",
      condition: { field: "userAgent", operator: "matches", value: "Chrome" },
      action: "flag",
      priority: 5,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("compliance", { userAgent: "Chrome/120.0" });
    expect(results).toHaveLength(1);
    expect(results[0].matched).toBe(true);
  });

  it("matches operator rejects non-matching input", async () => {
    repo.saveRule({
      id: "rule_4" as EntityId,
      name: "Regex no match",
      description: "Does not match user agent",
      domain: "compliance",
      condition: { field: "userAgent", operator: "matches", value: "^Firefox" },
      action: "flag",
      priority: 5,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("compliance", { userAgent: "Chrome/120.0" });
    expect(results).toHaveLength(0);
  });

  it("matches operator rejects ReDoS evil pattern with long input", async () => {
    repo.saveRule({
      id: "rule_5" as EntityId,
      name: "Evil regex",
      description: "ReDoS test",
      domain: "compliance",
      condition: { field: "input", operator: "matches", value: "(a+)+b" },
      action: "flag",
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const longInput = "a".repeat(500) + "X";
    const results = await engine.evaluate("compliance", { input: longInput });
    expect(results).toHaveLength(0);
  });

  it("matches operator rejects pattern exceeding max length", async () => {
    repo.saveRule({
      id: "rule_6" as EntityId,
      name: "Too long pattern",
      description: "Pattern over limit",
      domain: "compliance",
      condition: { field: "x", operator: "matches", value: "a".repeat(2000) },
      action: "flag",
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("compliance", { x: "hello" });
    expect(results).toHaveLength(0);
  });

  it("matches operator rejects input exceeding max length", async () => {
    repo.saveRule({
      id: "rule_7" as EntityId,
      name: "Normal regex",
      description: "Input too long",
      domain: "compliance",
      condition: { field: "x", operator: "matches", value: "hello" },
      action: "flag",
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("compliance", { x: "x".repeat(500) });
    expect(results).toHaveLength(0);
  });

  it("matches operator handles invalid regex syntax gracefully", async () => {
    repo.saveRule({
      id: "rule_8" as EntityId,
      name: "Invalid regex",
      description: "Unclosed group",
      domain: "compliance",
      condition: { field: "x", operator: "matches", value: "(unclosed" },
      action: "flag",
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const results = await engine.evaluate("compliance", { x: "test" });
    expect(results).toHaveLength(0);
  });
});

// ===========================================================================
// Analytics Engine
// ===========================================================================
describe("AnalyticsEngine", () => {
  it("computes period analytics", async () => {
    const { analytics, recommendation, repo } = createServices();
    // Create some recommendations first
    for (let i = 0; i < 3; i++) {
      const rec = await recommendation.create(actorId, { domain: "investor", type: "a", title: "T", description: "D", priority: 1, explainability: makeExplainability() });
      if (i === 0) await recommendation.accept(actorId, rec.id);
    }
    const entry = await analytics.computePeriod("2026-01");
    expect(entry.totalRecommendations).toBe(3);
    expect(entry.acceptedRecommendations).toBe(1);
    expect(entry.period).toBe("2026-01");
  });
});

// ===========================================================================
// Event Adapter
// ===========================================================================
describe("EventAdapter", () => {
  it("starts and stops subscriptions", async () => {
    const bus = createEventBus();
    const adapter = new EventAdapter(bus);
    const handler = vi.fn();
    adapter.register({ eventType: "test.event", description: "test", handle: handler });
    await adapter.start();
    await bus.publish(createEnvelope({
      type: "test.event",
      aggregateId: "a" as EntityId,
      actorId: actorId,
      payload: {},
    }));
    expect(handler).toHaveBeenCalled();
    adapter.stop();
  });
});

// ===========================================================================
// Integration: Orchestrator
// ===========================================================================
describe("AiOrchestrator", () => {
  it("registers all 11 advisors", () => {
    const { services } = createServices();
    const orchestrator = new AiOrchestrator(services);
    const advisors = orchestrator.listAdvisors();
    expect(advisors).toHaveLength(11);
    const domains = advisors.map(a => a.domain);
    expect(domains).toContain("investor");
    expect(domains).toContain("agent");
    expect(domains).toContain("marketplace");
    expect(domains).toContain("portfolio");
    expect(domains).toContain("treasury");
    expect(domains).toContain("governance");
    expect(domains).toContain("compliance");
    expect(domains).toContain("property");
    expect(domains).toContain("developer");
    expect(domains).toContain("executive");
    expect(domains).toContain("support");
  });

  it("processes a request end-to-end", async () => {
    const { services, router } = createServices();
    router.register(createFakeAdapter("Based on your portfolio, I recommend diversifying into commercial properties.\nReasoning: Commercial real estate shows strong 12% annual growth.\nEvidence: Market reports confirm."));
    const orchestrator = new AiOrchestrator(services);
    const result = await orchestrator.process({
      actorId,
      domain: "portfolio",
      query: "How should I diversify my portfolio?",
    });
    expect(result.recommendation).toBeDefined();
    expect(result.recommendation.domain).toBe("portfolio");
    expect(result.recommendation.explainability.reasoning).toContain("Commercial");
    expect(result.recommendation.status).toBe("pending");
  });

  it("processes a request with blocked policy", async () => {
    const { services, router, repo } = createServices();
    router.register(createFakeAdapter("high risk withdrawal\nReasoning: volatile.\nEvidence: test."));
    repo.saveRule({
      id: "rule_block" as EntityId,
      name: "Block risk",
      description: "test",
      domain: "treasury",
      condition: { field: "query", operator: "contains", value: "risk" },
      action: "deny",
      priority: 10,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const orchestrator = new AiOrchestrator(services);
    await expect(orchestrator.process({
      actorId,
      domain: "treasury",
      query: "This is a risk question",
    })).rejects.toThrow("blocked by policy");
  });
});

// ===========================================================================
// InMemory Repository
// ===========================================================================
describe("InMemoryAiRepository", () => {
  it("stores and retrieves policies", () => {
    const repo = new InMemoryAiRepository();
    const rule = {
      id: "p_1" as EntityId,
      name: "test",
      description: "test",
      condition: { field: "a", operator: "eq" as const, value: "b" },
      action: "flag" as const,
      priority: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repo.saveRule(rule);
    expect(repo.getRule("p_1" as EntityId)).toBeDefined();
    expect(repo.searchRules({ activeOnly: true })).toHaveLength(1);
    repo.deleteRule("p_1" as EntityId);
    expect(repo.getRule("p_1" as EntityId)).toBeUndefined();
  });
});
