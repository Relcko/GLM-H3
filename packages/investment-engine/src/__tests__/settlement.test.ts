import { describe, it, expect, beforeEach } from "vitest";
import { createProperty, AssetType, createInvestment } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { SettlementOrchestrator } from "../settlement/orchestrator";
import { OwnershipAllocator } from "../ownership/allocator";
import { LedgerAdapter } from "../ledger/adapter";
import { SettlementFailedError } from "../errors";
import { InvestmentTxStatus } from "../types";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

describe("SettlementOrchestrator", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let ownership: OwnershipAllocator;
  let ledger: LedgerAdapter;
  let orchestrator: SettlementOrchestrator;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    ownership = new OwnershipAllocator(repo, bus);
    ledger = new LedgerAdapter(repo, bus);
    orchestrator = new SettlementOrchestrator(repo, bus, ownership, ledger);
  });

  const makeProperty = () => {
    const prop = createProperty({
      slug: "test-prop",
      name: "Test",
      description: "Test",
      location: "Loc",
      assetType: AssetType.Residential,
      totalValue: 100000,
      tokenPrice: 10,
      totalTokens: 10000n,
      currency: Currency.USDT,
      expectedRoi: 8,
      rentalYield: 5,
      appreciationRate: 3,
      minInvestment: 10,
      blockchain: "97",
      contractAddress: addr("0x1234567890abcdef1234567890abcdef12345678"),
      tokenId: "1",
    });
    return { ...prop, status: "active" } as any;
  };

  it("settles a confirmed investment with valid transaction", async () => {
    const property = makeProperty();
    repo.saveProperty(property);

    const investment = createInvestment({
      investorId: eid("investor_1"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: 100,
      currency: Currency.USDT,
      kycVerified: true,
    });
    repo.saveInvestment(investment);

    const tx = {
      id: eid("tx_1"),
      investmentId: investment.id,
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token" as never,
      status: "confirmed" as InvestmentTxStatus,
      confirmations: 12,
      requiredConfirmations: 12,
      blockNumber: 12345,
      retryCount: 0,
      maxRetries: 3,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      txHash: addr("0xtxhash"),
    } as any;

    const settlement = await orchestrator.settle(eid("actor_1"), investment, property, tx);
    expect(settlement).toBeDefined();
    expect(settlement.investmentId).toBe(investment.id);
    expect(settlement.status).toBe("completed" as never);
    expect(settlement.tokens).toBe(10n);

    expect(bus.publishedOfType("investment.settlement_completed").length).toBe(1);
  });

  it("rejects settlement for unconfirmed transaction", async () => {
    const property = makeProperty();
    repo.saveProperty(property);

    const investment = createInvestment({
      investorId: eid("investor_1"),
      propertyId: property.id,
      fractionId: property.id,
      tokens: 10n,
      amount: 100,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const tx = {
      id: eid("tx_1"),
      investmentId: investment.id,
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token" as never,
      status: "pending" as InvestmentTxStatus,
      confirmations: 0,
      requiredConfirmations: 12,
      retryCount: 0,
      maxRetries: 3,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    } as any;

    await expect(orchestrator.settle(eid("actor_1"), investment, property, tx)).rejects.toThrow(SettlementFailedError);
  });
});
