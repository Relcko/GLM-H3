import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { TreasuryAccount } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { AccountNotFoundError, InsufficientBalanceError, TreasuryError } from "../errors";
import { createAccountSchema } from "../validation";
import type { z } from "zod";

type CreateAccountInput = z.infer<typeof createAccountSchema>;

export interface AccountUpdates {
  readonly name?: string;
  readonly description?: string;
  readonly active?: boolean;
}

export default class AccountService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async createAccount(actorId: EntityId, params: CreateAccountInput): Promise<TreasuryAccount> {
    const parsed = createAccountSchema.parse(params);
    const now = new Date().toISOString();

    const account: TreasuryAccount = {
      id: generateId("treasury") as EntityId,
      accountType: parsed.accountType,
      name: parsed.name,
      description: parsed.description ?? "",
      currency: parsed.currency as Currency,
      balance: 0n,
      reservedBalance: 0n,
      availableBalance: 0n,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveAccount(account);

    await publishTreasuryEvent(this.events, TreasuryEventType.AccountCreated, account.id, actorId, {
      accountId: account.id as string,
      accountType: account.accountType,
      name: account.name,
      currency: account.currency,
    });

    this.logger?.info("treasury account created", { accountId: account.id, accountType: account.accountType });
    return account;
  }

  async updateAccount(actorId: EntityId, id: EntityId, updates: AccountUpdates): Promise<TreasuryAccount> {
    const existing = this.repository.getAccount(id);
    if (!existing) throw new AccountNotFoundError(id as string);

    const updated: TreasuryAccount = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.active !== undefined && { active: updates.active }),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAccount(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.AccountUpdated, id, actorId, {
      accountId: id as string,
      changes: Object.keys(updates),
    });

    return updated;
  }

  getAccount(id: EntityId): TreasuryAccount | undefined {
    return this.repository.getAccount(id);
  }

  listAccountsByType(type: string): TreasuryAccount[] {
    return this.repository.listAccountsByType(type as any);
  }

  listAllAccounts(): TreasuryAccount[] {
    return this.repository.listAllAccounts();
  }

  async reserveBalance(actorId: EntityId, accountId: EntityId, amount: bigint): Promise<TreasuryAccount> {
    if (amount <= 0n) throw new TreasuryError("Reserve amount must be positive", "INVALID_AMOUNT");

    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);

    if (account.availableBalance < amount) {
      throw new InsufficientBalanceError(
        accountId as string,
        String(account.availableBalance),
        String(amount),
      );
    }

    const updated: TreasuryAccount = {
      ...account,
      reservedBalance: account.reservedBalance + amount,
      availableBalance: account.availableBalance - amount,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAccount(updated);
    return updated;
  }

  async releaseReservedBalance(actorId: EntityId, accountId: EntityId, amount: bigint): Promise<TreasuryAccount> {
    if (amount <= 0n) throw new TreasuryError("Release amount must be positive", "INVALID_AMOUNT");

    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);

    if (account.reservedBalance < amount) {
      throw new TreasuryError(
        `Cannot release ${amount} from reserved balance of ${account.reservedBalance}`,
        "INSUFFICIENT_RESERVED_BALANCE",
      );
    }

    const updated: TreasuryAccount = {
      ...account,
      reservedBalance: account.reservedBalance - amount,
      availableBalance: account.availableBalance + amount,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAccount(updated);
    return updated;
  }
}
