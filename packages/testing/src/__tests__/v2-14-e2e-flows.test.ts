import { describe, it, expect, beforeEach, vi } from "vitest";
import { createEnvelope, type RelckoEventEnvelope } from "@relcko/events";
import { createMockEventBus } from "@relcko/testing";
import { Currency, type EntityId } from "@relcko/types";
import { ProposalStatus } from "@relcko/governance";
import { aProperty } from "@relcko/testing";
import { PropertyStatus, transitionProperty } from "@relcko/domain-core";

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
import { InMemoryMarketplaceRepository } from "@relcko/marketplace";
import { InMemoryNftRepository } from "@relcko/nft-marketplace";
import { InMemoryIdentityRepository } from "@relcko/identity";
import { InMemoryInvestmentEngineRepository } from "@relcko/investment-engine";
import { InMemoryAiRepository } from "@relcko/ai-platform";


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

  const aiRepo = new InMemoryAiRepository();
  const logger = vi.fn() as any;
  logger.info = vi.fn(); logger.warn = vi.fn(); logger.error = vi.fn();
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

describe("V2.14 end-to-end cross-domain flows", () => {
  let p: ReturnType<typeof buildPlatform>;

  beforeEach(() => {
    p = buildPlatform();
  });

  it("onboards an investor through identity and propagates a canonical event", async () => {
    const account = await p.identity.registerIndividual({ email: "investor@relcko.io" });
    await p.identity.updateProfile(account.id, { email: "investor2@relcko.io" });

    const events = p.events.publishedOfType("identity.profile.updated");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].correlationId).toBeDefined();
    expect(events[0].traceId).toBeDefined();
    expect(events[0].aggregateId).toBe(account.id);
  });

  it("flows onboarding into the administration audit timeline", async () => {
    const account = await p.identity.registerIndividual({ email: "kyc@relcko.io" });
    const timeline = p.admin.timeline.byActor(account.id);
    expect(Array.isArray(timeline)).toBe(true);
  });

  it("completes a property investment end-to-end (reservation -> settlement -> ownership -> portfolio -> treasury journal)", async () => {
    const actor = "investor_x" as EntityId;
    let property = aProperty()
      .with({ slug: "v214-prop", blockchain: "1", totalTokens: 10_000n, tokenPrice: 100, currency: Currency.USDT })
      .build();
    property = transitionProperty(property, PropertyStatus.Upcoming);
    property = transitionProperty(property, PropertyStatus.Active);

    // Create treasury accounts the events adapter looks up when posting the journal.
    await p.treasury.accountService.createAccount(actor, {
      accountType: "revenue" as never, name: "Revenue", currency: Currency.USDT,
    });
    await p.treasury.accountService.createAccount(actor, {
      accountType: "operating" as never, name: "Operating", currency: Currency.USDT,
    });

    // tokenPrice at 100 USDT (major) → 100_000_000n minor units (USDT has 6 decimals).
    // 100 tokens × 100_000_000 = 10_000_000_000n minor units.
    const request = {
      id: "req_1" as EntityId,
      idempotencyKey: "idem_1",
      investorId: actor,
      propertyId: property.id,
      fractionId: "frac_1" as EntityId,
      tokens: 100n,
      amount: 10_000_000_000n,
      currency: Currency.USDT,
      paymentMethod: "crypto" as never,
      tokenAddress: "0xabc" as never,
      chainId: 1,
      walletAddress: "0xabc" as never,
    } as never;

    const { investment, reservation, transaction, settlement } = await p.investment.completePurchase(
      actor, request, property, "0xreceiver" as never, "0xhash" as never,
    );

    expect(investment).toBeDefined();
    expect(reservation).toBeDefined();
    expect(transaction).toBeDefined();
    expect(settlement).toBeDefined();

    expect(p.events.publishedOfType("investment.completed").length).toBeGreaterThanOrEqual(1);
    expect(p.events.publishedOfType("investment.settlement_completed").length).toBeGreaterThanOrEqual(1);
    expect(p.events.publishedOfType("investment.ownership_allocated").length).toBeGreaterThanOrEqual(1);

    expect(p.events.publishedOfType("treasury.external_event_processed").length).toBeGreaterThanOrEqual(1);
    expect(p.events.publishedOfType("treasury.journal_posted").length).toBeGreaterThanOrEqual(1);
  });

  it("routes a network commission payment into a treasury journal (commission routing)", async () => {
    const actor = "actor_net" as EntityId;
    const commissionId = "commission_1" as EntityId;

    await p.treasury.accountService.createAccount(actor, {
      accountType: "commission" as never,
      name: "Commission",
      currency: Currency.USDT,
    });
    await p.treasury.accountService.createAccount(actor, {
      accountType: "operating" as never,
      name: "Operating",
      currency: Currency.USDT,
    });

    const result = await p.events.publish(createEnvelope({
      type: "network.commission_paid",
      aggregateId: commissionId,
      actorId: actor,
      payload: { amount: "250", currency: "USDT" },
      version: 1,
    }));

    expect(result.subscriberResults.some(r => r.type === "network.commission_paid" && r.ok)).toBe(true);
    expect(p.events.publishedOfType("treasury.journal_posted").length).toBeGreaterThanOrEqual(1);
  });

  it("propagates a network override route event through the canonical bus (network override routing)", async () => {
    const actor = "actor_ovr" as EntityId;
    const routeId = "ovrroute_1" as EntityId;
    const result = await p.events.publish(createEnvelope({
      type: "network.override_route_created",
      aggregateId: routeId,
      actorId: actor,
      payload: { routeId, fromAgentId: "agent_child", uplineAgentId: "agent_parent", commissionRate: 0.05 },
      version: 1,
    }));
    expect(result.subscriberResults.some(r => r.type === "network.override_route_created" && r.ok)).toBe(true);
    expect(p.events.publishedOfType("network.override_route_created").length).toBe(1);
  });

  it("computes dividend eligibility and distributes, emitting treasury events", async () => {
    const actor = "actor_div" as EntityId;
    const divAccount = await p.treasury.accountService.createAccount(actor, {
      accountType: "dividend" as never,
      name: "Dividend",
      currency: Currency.USDT,
    });
    const opAccount = await p.treasury.accountService.createAccount(actor, {
      accountType: "operating" as never,
      name: "Operating",
      currency: Currency.USDT,
    });

    await p.treasury.ledgerService.postJournal(actor, {
      description: "Fund accounts for dividend",
      entries: [
        { accountId: opAccount.id as string, entryType: "debit", amount: 100000n, description: "fund op" },
        { accountId: divAccount.id as string, entryType: "credit", amount: 100000n, description: "fund div" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });

    const proposal = await p.treasury.dividendService.proposeDividend(actor, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 300n,
    } as never);
    await p.treasury.dividendService.approveDividend(actor, proposal.id);

    expect(p.events.publishedOfType("treasury.dividend_proposed").length).toBeGreaterThanOrEqual(1);
    expect(p.events.publishedOfType("treasury.dividend_approved").length).toBeGreaterThanOrEqual(1);

    const distributed = await p.treasury.dividendService.distributeDividend(actor, proposal.id);
    expect(distributed.status).toBe("distributed");
    expect(p.events.publishedOfType("treasury.dividend_distributed").length).toBeGreaterThanOrEqual(1);
  });

  it("mints and transfers an NFT through the canonical bus", async () => {
    const owner = "owner_1" as EntityId;
    const collection = await p.nft.collectionService.create(owner, {
      name: "Relcko Properties",
      symbol: "RLK",
      description: "Property-backed NFTs",
      creatorId: owner,
      standard: "erc721" as never,
      metadataUri: "ipfs://collection",
    } as never);
    const token = await p.nft.mintService.mint(owner, {
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
    } as never);

    expect(token).toBeDefined();
    expect(p.events.publishedOfType("nft.mint_completed").length).toBeGreaterThanOrEqual(1);

    await p.nft.transferService.transfer(owner, {
      nftId: token.id,
      fromOwnerId: owner,
      toOwnerId: "owner_2" as EntityId,
    } as never);
    expect(p.events.publishedOfType("nft.transferred").length).toBeGreaterThanOrEqual(1);
  });

  it("proposes, votes and transitions a governance proposal (governance flow)", async () => {
    const actor = "actor_gov" as EntityId;
    const proposal = await p.gov.proposalService.create(actor, {
      title: "Treasury rebalance",
      description: "Rebalance reserves",
      proposalType: "treasury" as never,
      actions: [],
    } as never);
    expect(p.events.publishedOfType("governance.proposal_created").length).toBeGreaterThanOrEqual(1);

    await p.gov.proposalService.submit(actor, proposal.id);
    await p.gov.lifecycleEngine.transition(actor, proposal.id, ProposalStatus.Active);
    await p.gov.votingEngine.castVote(actor, proposal.id, actor, "for" as never, 100n);

    expect(p.events.publishedOfType("governance.proposal_activated").length).toBeGreaterThanOrEqual(1);
    expect(p.events.publishedOfType("governance.vote_cast").length).toBeGreaterThanOrEqual(1);
  });

  it("generates an AI recommendation through the shared bus", async () => {
    const rec = await p.ai.advise("actor_ai" as EntityId, "investor" as never, "What should I invest in?");
    expect(rec).toBeDefined();
    expect(rec.domain).toBe("investor");
  });

  it("monitors operations and collects telemetry from the shared bus", async () => {
    await p.identity.registerIndividual({ email: "ops@relcko.io" });
    const telemetry = p.ops.metrics.query();
    expect(Array.isArray(telemetry)).toBe(true);
  });

  it("audits administration activity through the shared bus", async () => {
    const account = await p.identity.registerIndividual({ email: "audit@relcko.io" });
    const timeline = p.admin.timeline.byActor(account.id);
    expect(Array.isArray(timeline)).toBe(true);
  });

  it("collects performance telemetry without changing business behavior", async () => {
    await p.identity.registerIndividual({ email: "perf@relcko.io" });
    const metrics = p.performance.performance.analytics.metrics();
    expect(Array.isArray(metrics)).toBe(true);
  });
});
