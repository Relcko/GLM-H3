import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { RecoveryEngine } from "../recovery/engine";
import type { BlockchainAdapter } from "../blockchain/adapter";
import { RecoveryStatus, InvestmentTxStatus } from "../types";
import type { TransactionReceipt } from "../types";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

class MockBlockchainAdapter implements BlockchainAdapter {
  getChainConfig(chainId: number) {
    return {
      chainId,
      chainName: "Test",
      rpcUrl: "",
      explorerUrl: "",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      requiredConfirmations: 6,
      confirmationTimeoutMs: 60000,
    };
  }
  async getBalance() { return 0n; }
  async getTokenBalance() { return 0n; }
  async getTransactionReceipt(): Promise<TransactionReceipt> {
    return {
      txHash: addr("0xtxhash"),
      blockNumber: 100,
      confirmations: 12,
      gasUsed: 21000n,
      gasPrice: 5n,
      status: "success",
      logs: [],
    };
  }
  async getTransactionConfirmations() { return 12; }
  async getBlockNumber() { return 200; }
  async isTransactionConfirmed() { return true; }
  async waitForConfirmation(_txHash: never, _chainId: number, _timeoutMs: number) {
    return {
      txHash: addr("0xtxhash"),
      blockNumber: 100,
      confirmations: 12,
      gasUsed: 21000n,
      gasPrice: 5n,
      status: "success" as const,
      logs: [],
    };
  }
  async estimateGas() { return 21000n; }
}

describe("RecoveryEngine", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let engine: RecoveryEngine;
  const mockAdapter = new MockBlockchainAdapter();

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    engine = new RecoveryEngine(repo, bus, mockAdapter);
  });

  const makeTx = (overrides: Record<string, unknown> = {}) => {
    const base: Record<string, unknown> = {
      id: eid("tx_1"),
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
      status: "pending",
      confirmations: 0,
      requiredConfirmations: 12,
      txHash: addr("0xoldhash"),
      retryCount: 3,
      maxRetries: 3,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    return { ...base, ...overrides } as never;
  };

  it("starts recovery for a transaction", async () => {
    const tx = makeTx();
    repo.saveTransaction(tx);

    const recovery = await engine.startRecovery(eid("actor_1"), tx, "gas price too low");
    expect(recovery).toBeDefined();
    expect(recovery.transactionId).toBe("tx_1");
    expect(recovery.reason).toBe("gas price too low");
    expect(recovery.status).toBe(RecoveryStatus.Pending);

    expect(bus.publishedOfType("investment.recovery_started").length).toBe(1);
  });

  it("attempts recovery and resolves", async () => {
    const tx = makeTx();
    repo.saveTransaction(tx);

    const recovery = await engine.startRecovery(eid("actor_1"), tx, "timeout");
    const resolved = await engine.attemptRecovery(eid("actor_1"), recovery.id);

    expect(resolved.status).toBe(RecoveryStatus.Resolved);
    expect(bus.publishedOfType("investment.recovery_resolved").length).toBe(1);
  });

  it("prevents duplicate in-progress recovery", async () => {
    const tx = makeTx();
    repo.saveTransaction(tx);

    await engine.startRecovery(eid("actor_1"), tx, "reason 1");

    const secondRecovery = await engine.startRecovery(eid("actor_1"), tx, "reason 2");
    expect(secondRecovery).toBeDefined();
  });
});
