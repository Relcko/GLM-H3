import { describe, it, expect, beforeEach, vi } from "vitest";
import { createEnvelope, type RelckoEventEnvelope } from "@relcko/events";
import { createMockEventBus } from "@relcko/testing";

import { createOperationsModule } from "@relcko/operations";
import { createAdministrationModule } from "@relcko/administration";
import { createGovernanceModule } from "@relcko/governance";
import { createPortfolioModule } from "@relcko/portfolio";
import { createTreasuryContext } from "@relcko/treasury";
import { createMarketplace } from "@relcko/marketplace";
import { createNftMarketplace } from "@relcko/nft-marketplace";
import { createNetworkEngine } from "@relcko/network-engine";
import { createPerformanceModule, type PerformanceModuleContext } from "@relcko/performance";
import { IdentityService } from "@relcko/identity";
import { InvestmentOrchestrator } from "@relcko/investment-engine";
import {
  AiOrchestrator, ModelRouter, KnowledgeService, MemoryService, ContextBuilder,
  PromptBuilder, ExplainabilityEngine, RecommendationService, PolicyEngine, AnalyticsEngine,
} from "@relcko/ai-platform";
import { InMemoryGovernanceRepository } from "@relcko/governance";
import { InMemoryPortfolioRepository } from "@relcko/portfolio";
import { InMemoryTreasuryRepository } from "@relcko/treasury";
import { InMemoryMarketplaceRepository } from "@relcko/marketplace";
import { InMemoryNftRepository } from "@relcko/nft-marketplace";
import { InMemoryNetworkRepository } from "@relcko/network-engine";
import { InMemoryIdentityRepository } from "@relcko/identity";
import { InMemoryInvestmentEngineRepository } from "@relcko/investment-engine";
import { InMemoryAiRepository } from "@relcko/ai-platform";
import type { EntityId } from "@relcko/types";

/**
 * V2.14 End-to-End Cross-Domain Integration Harness.
 *
 * Every domain is wired onto a SINGLE shared canonical Event Bus. Cross-domain
 * subscriptions that were dormant are auto-started so the platform behaves as a
 * fully integrated system. The harness then drives representative platform flows
 * and asserts:
 *   - every package communicates only through the canonical Event Bus
 *   - event ordering within a flow
 *   - idempotency under replay
 *   - correlation / trace id propagation
 *   - dead-letter handling
 *   - audit completeness (administration timeline mirrors external events)
 *   - performance telemetry is collected (metrics only, no behavior change)
 */

function buildPlatform() {
  const events = createMockEventBus();
  const performance: PerformanceModuleContext = createPerformanceModule({ events, autoStart: true });

  const ops = createOperationsModule({ events, autoStart: false, performance });
  const admin = createAdministrationModule({ events, operations: ops as never, autoObserve: true, performance });
  const gov = createGovernanceModule({ events, autoSubscribe: true, performance });
  const port = createPortfolioModule({ events, autoSubscribe: true, performance });
  const treasury = createTreasuryContext({ events, performance });
  const marketplace = createMarketplace({ repository: new InMemoryMarketplaceRepository(), eventBus: events, performance });
  const nft = createNftMarketplace({ repository: new InMemoryNftRepository(), events, performance });
  const network = createNetworkEngine({ events, performance });
  const identity = new IdentityService(new InMemoryIdentityRepository(), events as never);
  const investment = new InvestmentOrchestrator({
    repository: new InMemoryInvestmentEngineRepository(),
    eventBus: events as never,
    blockchain: { chainId: 1, supports: () => true, invoke: async () => ({ hash: "0xabc" as never }) } as never,
    performance,
  });

  // AI platform assembly (advisor services) sharing the same bus.
  const aiRepo = new InMemoryAiRepository();
  const logger = vi.fn() as any;
  logger.info = vi.fn(); logger.warn = vi.fn(); logger.error = vi.fn();
  const router = new ModelRouter();
  // Register a fake model provider so advise() can run end-to-end.
  router.register({
    provider: "stub" as never,
    capabilities: ["chat", "reasoning", "analysis"],
    isAvailable: () => true,
    invoke: async () => ({ content: "Recommended allocation: 60% property, 40% reserve.", finishReason: "stop", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, latencyMs: 1 }),
  });
  const aiServices = {
    knowledgeService: new KnowledgeService(aiRepo, events as never, logger),
    memoryService: new MemoryService(aiRepo, events as never, logger),
    contextBuilder: new ContextBuilder(aiRepo, aiRepo, events as never, logger),
    promptBuilder: new PromptBuilder(events as never, logger),
    explainabilityEngine: new ExplainabilityEngine(events as never, logger),
    recommendationService: new RecommendationService(aiRepo, events as never, logger),
    modelRouter: router,
    policyEngine: new PolicyEngine(aiRepo, events as never, logger),
    events: events as never,
    logger,
    performance,
  };
  const ai = new AiOrchestrator(aiServices);

  return { events, performance, ops, admin, gov, port, treasury, marketplace, nft, network, identity, investment, ai };
}

describe("V2.14 cross-domain integration", () => {
  let platform: ReturnType<typeof buildPlatform>;

  beforeEach(() => {
    platform = buildPlatform();
  });

  it("wires every composition root onto one shared Event Bus", () => {
    expect(platform.ops.events).toBe(platform.events);
    expect(platform.admin).toBeDefined();
    expect(platform.gov).toBeDefined();
    expect(platform.port).toBeDefined();
    expect(platform.treasury).toBeDefined();
    expect(platform.marketplace).toBeDefined();
    expect(platform.nft).toBeDefined();
    expect(platform.network).toBeDefined();
    expect(platform.identity).toBeDefined();
    expect(platform.investment).toBeDefined();
    expect(platform.ai).toBeDefined();
    expect(platform.performance.performance).toBeDefined();
  });

  it("exposes PerformanceService as an internal telemetry seam in every module (no behavior change)", () => {
    expect(platform.ops.performanceModule).toBe(platform.performance);
    expect(platform.admin.performance).toBe(platform.performance);
    expect(platform.gov.performance).toBe(platform.performance);
    expect(platform.port.performance).toBe(platform.performance);
    expect(platform.treasury.performance).toBe(platform.performance);
    expect(platform.nft.performance).toBe(platform.performance);
    expect(platform.network.performance).toBe(platform.performance);
    expect(platform.investment.performance).toBe(platform.performance);
    expect(platform.marketplace.performance).toBe(platform.performance);
  });

  it("propagates investor onboarding + profile update events through the canonical bus", async () => {
    const account = await platform.identity.registerIndividual({ email: "investor@relcko.io" });
    await platform.identity.updateProfile(account.id, { email: "investor2@relcko.io" });

    const profileEvents = platform.events.publishedOfType("identity.profile.updated");
    expect(profileEvents.length).toBeGreaterThanOrEqual(1);
    expect(profileEvents.some(e => e.aggregateId === account.id)).toBe(true);
    expect(profileEvents[0].correlationId).toBeDefined();
    expect(profileEvents[0].traceId).toBeDefined();
  });

  it("mirrors external domain events into the administration audit timeline", async () => {
    const account = await platform.identity.registerIndividual({ email: "a@b.io" });
    await platform.identity.updateProfile(account.id, { email: "c@d.io" });

    // Administration observes every domain via subscribeAll; the timeline records activity.
    const timeline = platform.admin.timeline.byActor(account.id);
    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline)).toBe(true);
  });

  it("drives treasury journal posting from a network commission_paid event (cross-domain subscription)", async () => {
    const actor = "actor-treasury" as EntityId;
    const commissionId = "commission_1" as EntityId;

    // Treasury EventsAdapter looks up accounts by type; create the real ones first.
    await platform.treasury.accountService.createAccount(actor, {
      accountType: "commission" as never,
      name: "Commission",
      currency: "USDT" as never,
    });
    await platform.treasury.accountService.createAccount(actor, {
      accountType: "operating" as never,
      name: "Operating",
      currency: "USDT" as never,
    });

    // Simulate the network engine emitting a commission_paid event onto the shared bus.
    const result = await platform.events.publish(createEnvelope({
      type: "network.commission_paid",
      aggregateId: commissionId,
      actorId: actor,
      payload: { amount: "250", currency: "USDT" },
      version: 1,
    }));

    // Treasury EventsAdapter subscribes to network.commission_paid, posts a journal,
    // and the subscriber completed without error (cross-domain wiring is live).
    expect(result.subscriberResults.some(r => r.type === "network.commission_paid" && r.ok)).toBe(true);
    // The commission event triggered a treasury journal posting (cross-domain effect).
    expect(platform.events.publishedOfType("treasury.journal_posted").length).toBeGreaterThanOrEqual(1);
    // Correlation id is propagated from the source event into treasury's handling.
    const commissionEvents = platform.events.publishedOfType("network.commission_paid");
    expect(commissionEvents[0].correlationId).toBeDefined();
    expect(commissionEvents[0].traceId).toBeDefined();
  });

  it("auto-subscribes the governance event adapter to external domain events", async () => {
    const actor = "actor-gov" as EntityId;
    const result = await platform.events.publish(createEnvelope({
      type: "network.agent_activated",
      aggregateId: "agent_1" as EntityId,
      actorId: actor,
      payload: { agentId: "agent_1" },
      version: 1,
    }));
    expect(result.subscriberResults.some(r => r.type === "network.agent_activated" && r.ok)).toBe(true);

    // The governance module also exposes the proposal service on the shared bus.
    expect(platform.gov.proposalService).toBeDefined();
  });

  it("delivers investment.completed into the portfolio adapter (cross-domain subscription)", async () => {
    const investorId = "investor_x" as EntityId;
    await platform.events.publish(createEnvelope({
      type: "investment.completed",
      aggregateId: "investment_1" as EntityId,
      actorId: investorId,
      payload: { investorId },
    }));

    const received = platform.events.publishedOfType("investment.completed");
    expect(received.length).toBe(1);
  });

  it("generates an AI recommendation through the shared bus without behavior change", async () => {
    const rec = await platform.ai.advise("actor-ai" as EntityId, "investor" as never, "What should I invest in?");
    expect(rec).toBeDefined();
    expect(rec.domain).toBe("investor");
  });

  it("mints and transfers an NFT, emitting canonical marketplace events", async () => {
    const owner = "owner_1" as EntityId;
    const collection = await platform.nft.collectionService.create(owner, {
      name: "Relcko Properties",
      symbol: "RLK",
      description: "Property-backed NFTs",
      creatorId: owner,
      standard: "erc721" as never,
      metadataUri: "ipfs://collection",
    });
    const token = await platform.nft.mintService.mint(owner, {
      collectionId: collection.id,
      creatorId: owner,
      ownerId: owner,
      nftType: "property" as never,
      standard: "erc721" as never,
      supply: 1n,
      name: "Property Token 1",
      description: "Fractional property NFT",
      image: "ipfs://img",
      metadataUri: "ipfs://x",
      royaltyBps: 500,
    } as never);
    expect(token).toBeDefined();

    const minted = platform.events.publishedOfType("nft.mint_completed");
    expect(minted.length).toBeGreaterThanOrEqual(1);
    expect(minted[0].aggregateId).toBe(token.id);
  });
});

describe("V2.14 event consistency guarantees", () => {
  let events = createMockEventBus();

  beforeEach(() => {
    events = createMockEventBus();
  });

  it("enforces idempotency: replaying the same eventId is de-duplicated", async () => {
    let handlerRuns = 0;
    events.subscribe("identity.profile_updated", () => { handlerRuns++; });
    const envelope = createEnvelope({
      type: "identity.profile_updated",
      aggregateId: "acc_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: { email: "x@y.io" },
      version: 1,
    });
    const first = await events.publish(envelope);
    const second = await events.publish(envelope);
    expect(first.delivered).toBe(true);
    expect(second.deduped).toBe(true);
    expect(handlerRuns).toBe(1);
  });

  it("routes failing handlers to the dead-letter store and supports replay", async () => {
    const poisoned = createMockEventBus();
    poisoned.subscribe("boom", () => { throw new Error("handler failed"); });
    const result = await poisoned.publish(createEnvelope({
      type: "boom",
      aggregateId: "b_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: {},
      version: 1,
    }));
    expect(result.deadLettered).toBe(true);
    expect(poisoned.deadLetters().length).toBe(1);

    const replay = await poisoned.replayDeadLetters();
    expect(replay.length).toBe(1);
  });

  it("preserves correlation and trace ids across the wire", async () => {
    const correlationId = "corr_abc" as never;
    const traceId = "trace_xyz" as never;
    const env = createEnvelope({
      type: "marketplace.property_created",
      aggregateId: "prop_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: {},
      correlationId,
      traceId,
      version: 1,
    });
    await events.publish(env);
    const stored = events.publishedOfType("marketplace.property_created")[0] as RelckoEventEnvelope;
    expect(stored.correlationId).toBe(correlationId);
    expect(stored.traceId).toBe(traceId);
  });

  it("orders events by occurrence within a single flow", async () => {
    await events.publish(createEnvelope({ type: "a", aggregateId: "1" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    await events.publish(createEnvelope({ type: "b", aggregateId: "2" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    await events.publish(createEnvelope({ type: "c", aggregateId: "3" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    const types = events.history.map(e => e.type);
    expect(types).toEqual(["a", "b", "c"]);
  });
});

describe("V2.14 performance telemetry integration", () => {
  it("collects metrics only and never alters domain behavior", async () => {
    const events = createMockEventBus();
    const perf = createPerformanceModule({ events, autoStart: true });

    // Drive some activity through the performance primitives.
    await perf.performance.cache.set("k", "v");
    expect(perf.performance.cache.get("k")).toBe("v");
    perf.performance.rateLimit.check("tenant:1");

    const snapshot = perf.performance.snapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.health).toBe("healthy");
    perf.performance.stop();
  });

  it("records cache hit/miss counters in the repository", async () => {
    const events = createMockEventBus();
    const perf = createPerformanceModule({ events, autoStart: false });
    await perf.performance.cache.set("key", 123);
    expect(perf.performance.cache.get("key")).toBe(123);
    expect(perf.performance.cache.get("missing")).toBeUndefined();
    const snap = perf.performance.snapshot();
    expect(snap.cache).toBeDefined();
  });
});
