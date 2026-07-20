import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNetworkRepository } from "../in-memory-repository";
import { NetworkService } from "../network/service";
import { CommissionCalculator } from "../commission/service";
import { CommissionLedgerAdapter } from "../commission-ledger/service";
import { CommissionRecoveryEngine } from "../commission-recovery/service";
import { TreeTraversalEngine } from "../tree-traversal/service";
import { CommissionStatus, CommissionType, OverrideRouteStatus } from "../types";

describe("CommissionCalculator", () => {
  let repository: InMemoryNetworkRepository;
  let calculator: CommissionCalculator;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    calculator = new CommissionCalculator(repository, traversal, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "COMM01", currency: Currency.USDT, commissionRate: 10 });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
  });

  it("calculates personal commission", async () => {
    const agent = repository.getAgentByUserId("u1" as never)!;

    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id,
      amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never,
      sourceType: "investment",
      period: "2026-07",
    });

    expect(record.amount.amount).toBe(100n);
    expect(record.type).toBe(CommissionType.Personal);
    expect(record.status).toBe(CommissionStatus.Pending);
  });

  it("approves a pending commission", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;

    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });

    const approved = calculator.approve(actorId, record.id);
    expect(approved.status).toBe(CommissionStatus.Approved);
  });

  it("pays an approved commission", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;

    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });

    calculator.approve(actorId, record.id);
    const paid = calculator.pay(actorId, record.id);
    expect(paid.status).toBe(CommissionStatus.Paid);
  });

  it("cancels a commission", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;

    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });

    const cancelled = calculator.cancel(actorId, record.id);
    expect(cancelled.status).toBe(CommissionStatus.Cancelled);
  });
});

describe("CommissionLedgerAdapter", () => {
  let repository: InMemoryNetworkRepository;
  let calculator: CommissionCalculator;
  let ledger: CommissionLedgerAdapter;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    calculator = new CommissionCalculator(repository, traversal, events);
    ledger = new CommissionLedgerAdapter(repository);

    await networkService.register(actorId, { userId: "u1" as never, code: "LEDGER01", currency: Currency.USDT, commissionRate: 10 });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
  });

  it("records earned commission in ledger", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });

    const entry = ledger.recordEarned(record);
    expect(entry.entryType).toBe("earned");
    expect(entry.balanceAfter.amount).toBe(100n);
  });

  it("tracks balance across multiple entries", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const r1 = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });
    const r2 = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 2000n, currency: Currency.USDT },
      sourceId: "src-2" as never, sourceType: "investment", period: "2026-07",
    });

    ledger.recordEarned(r1);
    ledger.recordEarned(r2);

    const balance = ledger.getBalance(agent.id);
    expect(balance.amount).toBe(300n);
  });
});

describe("CommissionRecoveryEngine", () => {
  let repository: InMemoryNetworkRepository;
  let calculator: CommissionCalculator;
  let recovery: CommissionRecoveryEngine;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    calculator = new CommissionCalculator(repository, traversal, events);
    recovery = new CommissionRecoveryEngine(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "REC01", currency: Currency.USDT, commissionRate: 10 });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
  });

  it("recovers a paid commission", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });
    calculator.approve(actorId, record.id);
    calculator.pay(actorId, record.id);

    const rec = recovery.recover(actorId, record.id, "chargeback");
    expect(rec.amount.amount).toBe(100n);
    expect(rec.reason).toBe("chargeback");

    const updated = repository.getCommission(record.id)!;
    expect(updated.status).toBe(CommissionStatus.Recovered);
  });

  it("rejects recovery of non-paid commission", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const record = calculator.calculatePersonal(actorId, {
      agentId: agent.id, amount: { amount: 1000n, currency: Currency.USDT },
      sourceId: "src-1" as never, sourceType: "investment", period: "2026-07",
    });

    expect(() => recovery.recover(actorId, record.id, "test")).toThrow("Cannot recover");
  });
});
