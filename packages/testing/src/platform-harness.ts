import { vi } from "vitest";
import type { EntityId } from "@relcko/types";
import { createMockEventBus, type MockEventBus } from "./mock-event-bus";
import { createPerformanceModule, type PerformanceModuleContext } from "@relcko/performance";

import { createOperationsModule } from "@relcko/operations";
import { createAdministrationModule } from "@relcko/administration";
import { createGovernanceModule } from "@relcko/governance";
import { createPortfolioModule } from "@relcko/portfolio";
import { createTreasuryContext } from "@relcko/treasury";
import { createMarketplace } from "@relcko/marketplace";
import { createNftMarketplace } from "@relcko/nft-marketplace";
import { createNetworkEngine } from "@relcko/network-engine";
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

/**
 * V2.14 cross-domain platform harness.
 *
 * Wires EVERY domain package onto a SINGLE shared canonical Event Bus and a
 * SINGLE shared PerformanceService (telemetry seam). Cross-domain subscriptions
 * (treasury, portfolio, governance, network adapters) are auto-started so the
 * platform behaves as one integrated system. This is the canonical fixture for
 * end-to-end, cross-domain, performance, failure-recovery, concurrency, replay
 * and idempotency tests.
 */
export interface PlatformHarness {
  readonly events: MockEventBus;
  readonly performance: PerformanceModuleContext;
  readonly ops: ReturnType<typeof createOperationsModule>;
  readonly admin: ReturnType<typeof createAdministrationModule>;
  readonly gov: ReturnType<typeof createGovernanceModule>;
  readonly port: ReturnType<typeof createPortfolioModule>;
  readonly treasury: ReturnType<typeof createTreasuryContext>;
  readonly marketplace: ReturnType<typeof createMarketplace>;
  readonly nft: ReturnType<typeof createNftMarketplace>;
  readonly network: ReturnType<typeof createNetworkEngine>;
  readonly identity: IdentityService;
  readonly investment: InvestmentOrchestrator;
  readonly ai: AiOrchestrator;
}

export function buildPlatform(): PlatformHarness {
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

  const aiRepo = new InMemoryAiRepository();
  const logger = vi.fn() as never;
  (logger as unknown as { info: () => void }).info = vi.fn();
  (logger as unknown as { warn: () => void }).warn = vi.fn();
  (logger as unknown as { error: () => void }).error = vi.fn();
  const router = new ModelRouter();
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

export function makeEntityId(value: string): EntityId {
  return value as EntityId;
}
