import { describe, it, expect, beforeEach } from "vitest";
import {
  createProperty,
  AssetType,
  PropertyStatus,
  InvestmentStatus,
} from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { InvestmentOrchestrator } from "../orchestrator";
import { ViemBlockchainAdapter } from "../blockchain/adapter";
import { Currency } from "@relcko/types";
import type { InvestmentRequest } from "../types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

function makeActiveProperty() {
  const prop = createProperty({
    slug: "investment-ready",
    name: "Investment Ready Property",
    description: "Property that is ready for investment",
    location: "Metaverse",
    assetType: AssetType.Residential,
    totalValue: 500_000,
    tokenPrice: 50,
    totalTokens: 10_000n,
    currency: Currency.USDT,
    expectedRoi: 12,
    rentalYield: 6,
    appreciationRate: 4,
    minInvestment: 50,
    blockchain: "97",
    contractAddress: addr("0x1234567890abcdef1234567890abcdef12345678"),
    tokenId: "1",
  });
  return { ...prop, status: PropertyStatus.Active };
}

describe("InvestmentOrchestrator Integration", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let orchestrator: InvestmentOrchestrator;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    orchestrator = new InvestmentOrchestrator({
      repository: repo,
      eventBus: bus,
      blockchain: new ViemBlockchainAdapter(),
    });
  });

  it("completes full purchase flow end-to-end", async () => {
    const property = makeActiveProperty();
    repo.saveProperty(property);

    const request: InvestmentRequest = {
      investorId: eid("investor_full_flow"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0xInvestorWalletAddress1234567890abcdef12345678"),
      idempotencyKey: "integration-flow-key-1",
    };

    const { investment, reservation, transaction, settlement } = await orchestrator.completePurchase(
      eid("actor_integration"),
      request,
      property,
      addr("0xPropertyContractAddress"),
      addr("0xSuccessTxHash1234567890abcdef"),
    );

    expect(investment.status).toBe(InvestmentStatus.Pending);
    expect(investment.tokens).toBe(10n);
    expect(investment.investorId).toBe(request.investorId);
    expect(investment.propertyId).toBe(property.id);

    expect(reservation).toBeDefined();
    expect(reservation.investmentId).toBe(investment.id);

    expect(transaction.status).toBe("confirmed");
    expect(transaction.txHash).toBe("0xSuccessTxHash1234567890abcdef");

    expect(settlement.status).toBe("completed" as never);
    expect(settlement.investmentId).toBe(investment.id);

    const ownership = repo.getOwnership(investment.investorId, investment.propertyId);
    expect(ownership).toBeDefined();
    expect(ownership!.quantity).toBe(10n);

    const history = repo.listHistoryByInvestment(investment.id);
    expect(history.length).toBeGreaterThanOrEqual(1);

    const ledger = repo.listLedgerEntries(investment.id);
    expect(ledger.length).toBe(1);
  });

  it("publishes all canonical events through the full flow", async () => {
    const property = makeActiveProperty();
    repo.saveProperty(property);

    const request: InvestmentRequest = {
      investorId: eid("investor_events"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 5n,
      amount: property.tokenPrice.amount * 5n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0xWalletForEvents1234567890abcdef12345678"),
      idempotencyKey: "integration-events-key-1",
    };

    await orchestrator.completePurchase(
      eid("actor_events"),
      request,
      property,
      addr("0xContractAddress"),
      addr("0xTxHashForEvents1234567890abcdef"),
    );

    const eventTypes = new Set(bus.history.map(e => e.type));
    expect(eventTypes.has("investment.eligibility_passed")).toBe(true);
    expect(eventTypes.has("investment.reserved")).toBe(true);
    expect(eventTypes.has("investment.transaction_submitted")).toBe(true);
    expect(eventTypes.has("investment.transaction_confirmed")).toBe(true);
    expect(eventTypes.has("investment.settlement_completed")).toBe(true);
    expect(eventTypes.has("investment.ownership_allocated")).toBe(true);
    expect(eventTypes.has("investment.ledger_recorded")).toBe(true);
    expect(eventTypes.has("investment.completed")).toBe(true);
  });

  it("rejects duplicate idempotency key", async () => {
    const property = makeActiveProperty();
    repo.saveProperty(property);

    const request: InvestmentRequest = {
      investorId: eid("investor_dedup"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 5n,
      amount: property.tokenPrice.amount * 5n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0xWalletDedup1234567890abcdef12345678"),
      idempotencyKey: "dedup-key-1",
    };

    await orchestrator.completePurchase(
      eid("actor_dedup"),
      request,
      property,
      addr("0xContract"),
      addr("0xTxHash1"),
    );

    await expect(
      orchestrator.completePurchase(
        eid("actor_dedup"),
        request,
        property,
        addr("0xContract"),
        addr("0xTxHash2"),
      ),
    ).rejects.toThrow("Double submit");
  });

  it("rejects chain mismatch", async () => {
    const property = makeActiveProperty();
    repo.saveProperty(property);

    const request: InvestmentRequest = {
      investorId: eid("investor_chain"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 5n,
      amount: property.tokenPrice.amount * 5n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 56,
      walletAddress: addr("0xWalletChain1234567890abcdef12345678"),
      idempotencyKey: "chain-key-1",
    };

    await expect(
      orchestrator.requestInvestment(eid("actor_chain"), request, property),
    ).rejects.toThrow("Chain mismatch");
  });

  it("maintains portfolio after settlement", async () => {
    const property = makeActiveProperty();
    repo.saveProperty(property);

    const request: InvestmentRequest = {
      investorId: eid("investor_portfolio"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: property.tokenPrice.amount * 10n,
      currency: Currency.USDT,
      paymentMethod: "native_token" as never,
      chainId: 97,
      walletAddress: addr("0xWalletPortfolio1234567890abcdef12345678"),
      idempotencyKey: "portfolio-key-1",
    };

    await orchestrator.completePurchase(
      eid("actor_portfolio"),
      request,
      property,
      addr("0xContract"),
      addr("0xTxHashPortfolio"),
    );

    const snapshot = orchestrator.portfolio.getPortfolio(eid("investor_portfolio"));
    expect(snapshot).toBeDefined();
    expect(snapshot!.holdings.length).toBe(1);
    expect(snapshot!.holdings[0].quantity).toBe(10n);
  });
});
