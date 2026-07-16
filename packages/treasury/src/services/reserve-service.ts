import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { ReserveConfig, JournalEntry, LedgerEntry } from "../types";
import { JournalStatus, TreasuryEntryType, TreasuryHealthStatus } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { AccountNotFoundError, ReserveError } from "../errors";

export interface ConfigureReserveInput {
  readonly accountId: EntityId;
  readonly targetAmount: bigint;
  readonly minThreshold: bigint;
  readonly maxThreshold: bigint;
  readonly replenishRate: number;
}

export interface ReserveHealthResult {
  readonly status: TreasuryHealthStatus;
  readonly currentAmount: bigint;
  readonly targetAmount: bigint;
  readonly minThreshold: bigint;
  readonly maxThreshold: bigint;
  readonly shortfall: bigint;
  readonly surplus: bigint;
  readonly ratio: number;
}

export default class ReserveService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async configureReserve(actorId: EntityId, params: ConfigureReserveInput): Promise<ReserveConfig> {
    const account = this.repository.getAccount(params.accountId);
    if (!account) throw new AccountNotFoundError(params.accountId as string);

    if (params.minThreshold > params.targetAmount) {
      throw new ReserveError("minThreshold cannot exceed targetAmount");
    }
    if (params.maxThreshold < params.targetAmount) {
      throw new ReserveError("maxThreshold cannot be less than targetAmount");
    }

    const existing = this.repository.getReserveConfig(params.accountId);
    const now = new Date().toISOString();

    const config: ReserveConfig = existing
      ? {
          ...existing,
          targetAmount: params.targetAmount,
          currentAmount: account.balance,
          minThreshold: params.minThreshold,
          maxThreshold: params.maxThreshold,
          replenishRate: params.replenishRate,
          updatedAt: now,
        }
      : {
          id: generateId("treasury") as EntityId,
          accountId: params.accountId,
          targetAmount: params.targetAmount,
          currentAmount: account.balance,
          minThreshold: params.minThreshold,
          maxThreshold: params.maxThreshold,
          replenishRate: params.replenishRate,
          active: true,
          createdAt: now,
          updatedAt: now,
        };

    this.repository.saveReserveConfig(config);

    await publishTreasuryEvent(this.events, TreasuryEventType.ReserveConfigured, config.id, actorId, {
      configId: config.id as string,
      accountId: params.accountId as string,
      targetAmount: String(params.targetAmount),
    });

    this.logger?.info("reserve configured", { configId: config.id, accountId: params.accountId });
    return config;
  }

  checkReserveHealth(accountId: EntityId): ReserveHealthResult {
    const config = this.repository.getReserveConfig(accountId);
    if (!config) throw new ReserveError(`No reserve config found for account ${accountId}`);

    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);

    const currentAmount = account.balance;
    const shortfall = currentAmount < config.targetAmount
      ? config.targetAmount - currentAmount
      : 0n;
    const surplus = currentAmount > config.targetAmount
      ? currentAmount - config.targetAmount
      : 0n;
    const ratio = config.targetAmount > 0n
      ? Number((currentAmount * 10000n) / config.targetAmount) / 100
      : 0;

    let status: TreasuryHealthStatus;
    if (currentAmount >= config.minThreshold && currentAmount <= config.maxThreshold) {
      status = TreasuryHealthStatus.Healthy;
    } else if (currentAmount >= config.minThreshold) {
      status = TreasuryHealthStatus.Warning;
    } else {
      status = TreasuryHealthStatus.Critical;
    }

    return {
      status,
      currentAmount,
      targetAmount: config.targetAmount,
      minThreshold: config.minThreshold,
      maxThreshold: config.maxThreshold,
      shortfall,
      surplus,
      ratio,
    };
  }

  async replenishReserve(
    actorId: EntityId,
    accountId: EntityId,
    operatingAccountId: EntityId,
  ): Promise<JournalEntry> {
    const config = this.repository.getReserveConfig(accountId);
    if (!config) throw new ReserveError(`No reserve config found for account ${accountId}`);

    const health = this.checkReserveHealth(accountId);
    if (health.shortfall <= 0n) {
      throw new ReserveError(`Reserve ${accountId} is already at or above target`);
    }

    const replenishAmount = BigInt(
      Math.floor(Number(health.shortfall) * config.replenishRate / 100),
    );
    if (replenishAmount <= 0n) {
      throw new ReserveError("Computed replenish amount is zero");
    }

    const sourceAccount = this.repository.getAccount(operatingAccountId);
    if (!sourceAccount) throw new AccountNotFoundError(operatingAccountId as string);

    if (sourceAccount.availableBalance < replenishAmount) {
      throw new ReserveError(
        `Operating account ${operatingAccountId} has insufficient available balance for replenishment`,
      );
    }

    const destAccount = this.repository.getAccount(accountId);
    if (!destAccount) throw new AccountNotFoundError(accountId as string);

    const now = new Date().toISOString();
    const journalId = generateId("treasury") as EntityId;

    const sourceBalanceBefore = sourceAccount.balance;
    const sourceBalanceAfter = sourceAccount.balance - replenishAmount;

    this.repository.saveAccount({
      ...sourceAccount,
      balance: sourceBalanceAfter,
      availableBalance: sourceAccount.availableBalance - replenishAmount,
      updatedAt: now,
    });

    const destBalanceBefore = destAccount.balance;
    const destBalanceAfter = destAccount.balance + replenishAmount;

    this.repository.saveAccount({
      ...destAccount,
      balance: destBalanceAfter,
      availableBalance: destAccount.availableBalance + replenishAmount,
      updatedAt: now,
    });

    const entries: LedgerEntry[] = [
      {
        id: generateId("treasury") as EntityId,
        journalId,
        accountId: operatingAccountId,
        entryType: TreasuryEntryType.Credit,
        amount: replenishAmount,
        currency: sourceAccount.currency,
        balanceBefore: sourceBalanceBefore,
        balanceAfter: sourceBalanceAfter,
        description: "Reserve replenishment credit from operating",
        reference: `REPLENISH_${accountId}`,
        referenceId: accountId,
        createdAt: now,
      },
      {
        id: generateId("treasury") as EntityId,
        journalId,
        accountId,
        entryType: TreasuryEntryType.Debit,
        amount: replenishAmount,
        currency: destAccount.currency,
        balanceBefore: destBalanceBefore,
        balanceAfter: destBalanceAfter,
        description: "Reserve replenishment debit",
        reference: `REPLENISH_${accountId}`,
        referenceId: accountId,
        createdAt: now,
      },
    ];

    const journal: JournalEntry = {
      id: journalId,
      description: `Auto-replenish reserve ${accountId} from ${operatingAccountId}`,
      status: JournalStatus.Posted,
      entries,
      debitTotal: replenishAmount,
      creditTotal: replenishAmount,
      balanced: true,
      reference: `REPLENISH_${accountId}`,
      referenceId: accountId,
      postedAt: now,
      createdAt: now,
    };

    for (const entry of entries) {
      this.repository.saveLedgerEntry(entry);
    }
    this.repository.saveJournal(journal);

    this.repository.saveReserveConfig({
      ...config,
      currentAmount: destBalanceAfter,
      updatedAt: now,
    });

    this.logger?.info("reserve replenished", {
      accountId,
      amount: replenishAmount,
      journalId,
    });

    return journal;
  }

  listConfigs(): ReserveConfig[] {
    return this.repository.listReserveConfigs();
  }

  getConfig(accountId: EntityId): ReserveConfig | undefined {
    return this.repository.getReserveConfig(accountId);
  }
}
