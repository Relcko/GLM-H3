import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { Currency } from "@relcko/types";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import AllocationService from "../services/allocation-service";
import ReserveService from "../services/reserve-service";
import MovementService from "../services/movement-service";
import { TreasuryAccountType, MovementStatus, TreasuryHealthStatus } from "../types";
import { AllocationError, AccountNotFoundError } from "../errors";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

describe("AllocationService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let allocationService: AllocationService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;
  let revenueAccountId: string;
  let operatingAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    allocationService = new AllocationService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const rev = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Revenue,
      name: "Revenue Source",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating Dest",
      currency: Currency.USDT,
    });
    revenueAccountId = rev.id as string;
    operatingAccountId = op.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund revenue",
      entries: [
        { accountId: revenueAccountId, entryType: "debit", amount: 100000n, description: "initial" },
        { accountId: operatingAccountId, entryType: "credit", amount: 100000n, description: "initial" },
      ],
      reference: "INIT",
      referenceId: "init-1",
    });
  });

  it("configureRule creates active rule", async () => {
    const rule = await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: operatingAccountId as never,
      percentage: 50,
      priority: 1,
    });

    expect(rule.active).toBe(true);
    expect(rule.percentage).toBe(50);
    expect(rule.priority).toBe(1);
  });

  it("configureRule rejects invalid percentage", async () => {
    await expect(
      allocationService.configureRule(actorId, {
        sourceType: TreasuryAccountType.Revenue,
        destinationAccountId: operatingAccountId as never,
        percentage: 0,
        priority: 1,
      }),
    ).rejects.toThrow(AllocationError);
  });

  it("executeAllocation creates ledger entries and journal", async () => {
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: operatingAccountId as never,
      percentage: 100,
      priority: 1,
    });

    const allocation = await allocationService.executeAllocation(actorId, {
      sourceAccountId: revenueAccountId as never,
      amount: 50000n,
      currency: Currency.USDT,
      period: "2026-01",
    });

    expect(allocation.rules.length).toBe(1);
    expect(allocation.rules[0].amount).toBe(50000n);

    const destAccount = repository.getAccount(operatingAccountId as never);
    expect(destAccount!.balance).toBe(-50000n);
  });

  it("deactivateRule marks rule inactive", async () => {
    const rule = await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: operatingAccountId as never,
      percentage: 50,
      priority: 1,
    });

    const deactivated = await allocationService.deactivateRule(actorId, rule.id as never);
    expect(deactivated.active).toBe(false);

    const activeRules = allocationService.listActiveRules();
    expect(activeRules.length).toBe(0);
  });
});

describe("ReserveService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let reserveService: ReserveService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;
  let reserveAccountId: string;
  let operatingAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    reserveService = new ReserveService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const reserveAcct = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.EmergencyReserve,
      name: "Emergency Reserve",
      currency: Currency.USDT,
    });
    const opAcct = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
    reserveAccountId = reserveAcct.id as string;
    operatingAccountId = opAcct.id as string;
  });

  it("configureReserve creates config", async () => {
    const config = await reserveService.configureReserve(actorId, {
      accountId: reserveAccountId as never,
      targetAmount: 50000n,
      minThreshold: 25000n,
      maxThreshold: 75000n,
      replenishRate: 50,
    });

    expect(config.targetAmount).toBe(50000n);
    expect(config.currentAmount).toBe(0n);
    expect(config.active).toBe(true);
  });

  it("checkReserveHealth returns healthy when within range", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund reserve",
      entries: [
        { accountId: reserveAccountId, entryType: "debit", amount: 50000n, description: "fund reserve" },
        { accountId: operatingAccountId, entryType: "credit", amount: 50000n, description: "fund reserve" },
      ],
      reference: "FR",
      referenceId: "fr-1",
    });

    await reserveService.configureReserve(actorId, {
      accountId: reserveAccountId as never,
      targetAmount: 50000n,
      minThreshold: 25000n,
      maxThreshold: 75000n,
      replenishRate: 50,
    });

    const health = reserveService.checkReserveHealth(reserveAccountId as never);
    expect(health.status).toBe(TreasuryHealthStatus.Healthy);
    expect(health.currentAmount).toBe(50000n);
  });

  it("checkReserveHealth returns warning when above max", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Overfund reserve",
      entries: [
        { accountId: reserveAccountId, entryType: "debit", amount: 80000n, description: "overfund" },
        { accountId: operatingAccountId, entryType: "credit", amount: 80000n, description: "overfund" },
      ],
      reference: "OF",
      referenceId: "of-1",
    });

    await reserveService.configureReserve(actorId, {
      accountId: reserveAccountId as never,
      targetAmount: 50000n,
      minThreshold: 25000n,
      maxThreshold: 75000n,
      replenishRate: 50,
    });

    const health = reserveService.checkReserveHealth(reserveAccountId as never);
    expect(health.status).toBe(TreasuryHealthStatus.Warning);
  });

  it("checkReserveHealth returns critical when below min", async () => {
    await reserveService.configureReserve(actorId, {
      accountId: reserveAccountId as never,
      targetAmount: 50000n,
      minThreshold: 25000n,
      maxThreshold: 75000n,
      replenishRate: 50,
    });

    const health = reserveService.checkReserveHealth(reserveAccountId as never);
    expect(health.status).toBe(TreasuryHealthStatus.Critical);
    expect(health.shortfall).toBe(50000n);
  });

  it("replenishReserve posts journal and updates config", async () => {
    await reserveService.configureReserve(actorId, {
      accountId: reserveAccountId as never,
      targetAmount: 50000n,
      minThreshold: 25000n,
      maxThreshold: 75000n,
      replenishRate: 100,
    });

    const opAccount = repository.getAccount(operatingAccountId as never);
    repository.saveAccount({
      ...opAccount!,
      balance: 100000n,
      availableBalance: 100000n,
      updatedAt: new Date().toISOString(),
    });

    const journal = await reserveService.replenishReserve(
      actorId,
      reserveAccountId as never,
      operatingAccountId as never,
    );

    expect(journal.balanced).toBe(true);
    expect(journal.debitTotal).toBe(50000n);

    const config = reserveService.getConfig(reserveAccountId as never);
    expect(config!.currentAmount).toBe(50000n);

    const opAccountAfter = repository.getAccount(operatingAccountId as never);
    expect(opAccountAfter!.balance).toBe(50000n);
  });
});

describe("MovementService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let movementService: MovementService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;
  let fromAccountId: string;
  let toAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    movementService = new MovementService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const from = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Source Account",
      currency: Currency.USDT,
    });
    const to = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Dest Account",
      currency: Currency.USDT,
    });
    fromAccountId = from.id as string;
    toAccountId = to.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund source",
      entries: [
        { accountId: fromAccountId, entryType: "debit", amount: 20000n, description: "fund" },
        { accountId: toAccountId, entryType: "credit", amount: 20000n, description: "fund" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });
  });

  it("createMovement creates pending movement", async () => {
    const movement = await movementService.createMovement(actorId, {
      fromAccountId,
      toAccountId,
      amount: { amount: 5000n, currency: Currency.USDT },
      reason: "Test transfer",
    });

    expect(movement.status).toBe(MovementStatus.Pending);
    expect(movement.amount.amount).toBe(5000n);
  });

  it("approveMovement transitions to approved", async () => {
    const movement = await movementService.createMovement(actorId, {
      fromAccountId,
      toAccountId,
      amount: { amount: 5000n, currency: Currency.USDT },
      reason: "Test transfer",
    });

    const approved = await movementService.approveMovement(actorId, movement.id as never, "approver-1" as never);
    expect(approved.status).toBe(MovementStatus.Approved);
    expect(approved.approvedBy).toBe("approver-1" as never);
  });

  it("completeMovement posts journal and updates balances", async () => {
    const movement = await movementService.createMovement(actorId, {
      fromAccountId,
      toAccountId,
      amount: { amount: 5000n, currency: Currency.USDT },
      reason: "Test transfer",
    });

    await movementService.approveMovement(actorId, movement.id as never, "approver-1" as never);
    const completed = await movementService.completeMovement(actorId, movement.id as never);

    expect(completed.status).toBe(MovementStatus.Completed);
    expect(completed.journalId).toBeDefined();

    const fromAccount = repository.getAccount(fromAccountId as never);
    expect(fromAccount!.balance).toBe(15000n);

    const toAccount = repository.getAccount(toAccountId as never);
    expect(toAccount!.balance).toBe(-15000n);
  });

  it("rejectMovement sets status to rejected", async () => {
    const movement = await movementService.createMovement(actorId, {
      fromAccountId,
      toAccountId,
      amount: { amount: 5000n, currency: Currency.USDT },
      reason: "Test transfer",
    });

    const rejected = await movementService.rejectMovement(actorId, movement.id as never, "Not approved");
    expect(rejected.status).toBe(MovementStatus.Rejected);
  });
});
