import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { TransactionEngine } from "../transaction/engine";
import { SecurityGuard } from "../security/guard";
import { ViemBlockchainAdapter } from "../blockchain/adapter";
import { TransactionNotFoundError } from "../errors";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

describe("TransactionEngine", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let engine: TransactionEngine;
  let security: SecurityGuard;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    security = new SecurityGuard(repo);
    engine = new TransactionEngine(repo, bus, new ViemBlockchainAdapter(), security);
  });

  it("creates a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    expect(tx).toBeDefined();
    expect(tx.investmentId).toBe("inv_1");
    expect(tx.status).toBe("pending");
    expect(tx.retryCount).toBe(0);
  });

  it("publishes submitted event", async () => {
    await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    expect(bus.publishedOfType("investment.transaction_submitted").length).toBe(1);
  });

  it("marks transaction as submitted", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const submitted = await engine.markSubmitted(eid("actor_1"), tx.id, addr("0xtxhash"));
    expect(submitted.status).toBe("submitted");
    expect(submitted.txHash).toBe("0xtxhash");
  });

  it("confirms a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const confirmed = await engine.confirmTransaction(eid("actor_1"), tx.id, {
      txHash: addr("0xtxhash"),
      blockNumber: 12345,
      gasUsed: 21000n,
      gasPrice: 5000000000n,
    });

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.blockNumber).toBe(12345);
    expect(bus.publishedOfType("investment.transaction_confirmed").length).toBe(1);
  });

  it("fails a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const failed = await engine.failTransaction(eid("actor_1"), tx.id, "insufficient funds");
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("insufficient funds");
    expect(bus.publishedOfType("investment.transaction_failed").length).toBe(1);
  });

  it("retries a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const retried = await engine.retryTransaction(eid("actor_1"), tx.id);
    expect(retried.retryCount).toBe(1);
    expect(retried.status).toBe("pending");
    expect(bus.publishedOfType("investment.transaction_retried").length).toBe(1);
  });

  it("throws on missing transaction", () => {
    expect(() => engine.getTransaction(eid("nonexistent"))).toThrow(TransactionNotFoundError);
  });

  it("cancels a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const cancelled = await engine.cancelTransaction(eid("actor_1"), tx.id);
    expect(cancelled.status).toBe("cancelled");
  });

  it("expires a transaction", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const expired = await engine.expireTransaction(eid("actor_1"), tx.id);
    expect(expired.status).toBe("expired");
  });

  it("exhausts retries", async () => {
    const tx = await engine.createTransaction(eid("actor_1"), {
      investmentId: eid("inv_1"),
      reservationId: eid("res_1"),
      investorId: eid("investor_1"),
      chainId: 97,
      from: addr("0xfrom"),
      to: addr("0xto"),
      amount: 100n,
      currency: Currency.USDT,
      method: "native_token",
    });

    const txWithMaxRetries = { ...tx, maxRetries: 1 };
    repo.saveTransaction(txWithMaxRetries);

    const retried = await engine.retryTransaction(eid("actor_1"), tx.id);
    expect(retried.retryCount).toBe(1);

    await expect(engine.retryTransaction(eid("actor_1"), tx.id)).rejects.toThrow("exceeded max retries");
  });
});
