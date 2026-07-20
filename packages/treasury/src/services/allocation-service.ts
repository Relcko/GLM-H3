import type { EntityId, Money } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { AllocationRule, TreasuryAllocation, AllocationExecution, LedgerEntry, JournalEntry } from "../types";
import { JournalStatus, TreasuryEntryType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { AccountNotFoundError, AllocationError, InsufficientBalanceError } from "../errors";

export interface ConfigureRuleInput {
  readonly sourceType: string;
  readonly destinationAccountId: EntityId;
  readonly percentage: number;
  readonly priority: number;
}

export interface ExecuteAllocationInput {
  readonly sourceAccountId: EntityId;
  readonly amount: bigint;
  readonly currency: string;
  readonly period: string;
}

export default class AllocationService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async configureRule(actorId: EntityId, params: ConfigureRuleInput): Promise<AllocationRule> {
    const now = new Date().toISOString();

    if (params.percentage <= 0 || params.percentage > 100) {
      throw new AllocationError("Percentage must be between 1 and 100");
    }

    const rule: AllocationRule = {
      id: generateId("treasury") as EntityId,
      sourceType: params.sourceType as any,
      destinationAccountId: params.destinationAccountId,
      percentage: params.percentage,
      priority: params.priority,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveAllocationRule(rule);

    this.logger?.info("allocation rule configured", { ruleId: rule.id, percentage: rule.percentage });
    return rule;
  }

  async executeAllocation(actorId: EntityId, input: ExecuteAllocationInput): Promise<TreasuryAllocation> {
    const sourceAccount = this.repository.getAccount(input.sourceAccountId);
    if (!sourceAccount) throw new AccountNotFoundError(input.sourceAccountId as string);

    if (sourceAccount.balance < input.amount) {
      throw new InsufficientBalanceError(
        input.sourceAccountId as string,
        String(sourceAccount.balance),
        String(input.amount),
      );
    }

    const activeRules = this.repository.listActiveAllocationRules()
      .filter(r => String(r.sourceType) === String(sourceAccount.accountType))
      .sort((a, b) => a.priority - b.priority);

    if (activeRules.length === 0) {
      throw new AllocationError(`No active allocation rules for source type ${sourceAccount.accountType}`);
    }

    const totalPercentage = activeRules.reduce((sum, r) => sum + r.percentage, 0);
    if (totalPercentage !== 100) {
      throw new AllocationError(
        `Active allocation rules sum to ${totalPercentage}%, must equal 100%`,
      );
    }

    const now = new Date().toISOString();
    const journalId = generateId("treasury") as EntityId;

    const executions: AllocationExecution[] = [];
    const ledgerEntries: LedgerEntry[] = [];

    let allocatedTotal = 0n;
    for (let i = 0; i < activeRules.length; i++) {
      const rule = activeRules[i];
      const isLast = i === activeRules.length - 1;
      const share = isLast
        ? input.amount - allocatedTotal
        : (input.amount * BigInt(rule.percentage)) / 100n;

      if (share <= 0n) continue;

      const destAccount = this.repository.getAccount(rule.destinationAccountId);
      if (!destAccount) throw new AccountNotFoundError(rule.destinationAccountId as string);

      executions.push({
        ruleId: rule.id,
        accountId: rule.destinationAccountId,
        amount: share,
        percentage: rule.percentage,
      });

      allocatedTotal += share;

      const destBalanceBefore = destAccount.balance;
      const destBalanceAfter = destBalanceBefore + share;

      this.repository.saveAccount({
        ...destAccount,
        balance: destBalanceAfter,
        availableBalance: destAccount.availableBalance + share,
        updatedAt: now,
      });

      ledgerEntries.push({
        id: generateId("treasury") as EntityId,
        journalId,
        accountId: rule.destinationAccountId,
        entryType: TreasuryEntryType.Debit,
        amount: share,
        currency: input.currency as Currency,
        balanceBefore: destBalanceBefore,
        balanceAfter: destBalanceAfter,
        description: `Allocation from ${sourceAccount.name} (${rule.sourceType})`,
        reference: `ALLOC_${input.period}`,
        referenceId: input.sourceAccountId,
        createdAt: now,
      });
    }

    const sourceBalanceBefore = sourceAccount.balance;
    const sourceBalanceAfter = sourceAccount.balance - input.amount;

    this.repository.saveAccount({
      ...sourceAccount,
      balance: sourceBalanceAfter,
      availableBalance: sourceAccount.availableBalance - input.amount,
      updatedAt: now,
    });

    ledgerEntries.push({
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: input.sourceAccountId,
      entryType: TreasuryEntryType.Credit,
      amount: input.amount,
      currency: input.currency as Currency,
      balanceBefore: sourceBalanceBefore,
      balanceAfter: sourceBalanceAfter,
      description: `Allocation source debit for period ${input.period}`,
      reference: `ALLOC_${input.period}`,
      referenceId: input.sourceAccountId,
      createdAt: now,
    });

    const journal: JournalEntry = {
      id: journalId,
      description: `Revenue allocation for period ${input.period}`,
      status: JournalStatus.Posted,
      entries: ledgerEntries,
      debitTotal: allocatedTotal,
      creditTotal: input.amount,
      balanced: allocatedTotal === input.amount,
      reference: `ALLOC_${input.period}`,
      referenceId: input.sourceAccountId,
      postedAt: now,
      createdAt: now,
    };

    for (const entry of ledgerEntries) {
      this.repository.saveLedgerEntry(entry);
    }
    this.repository.saveJournal(journal);

    const allocation: TreasuryAllocation = {
      id: generateId("treasury") as EntityId,
      sourceAmount: { amount: input.amount, currency: input.currency as Currency },
      rules: executions,
      period: input.period,
      allocatedAt: now,
    };

    this.repository.saveAllocation(allocation);

    await publishTreasuryEvent(this.events, TreasuryEventType.AllocationExecuted, input.sourceAccountId, actorId, {
      allocationId: allocation.id as string,
      sourceAccountId: input.sourceAccountId as string,
      period: input.period,
      totalAmount: String(input.amount),
      ruleCount: executions.length,
      journalId: journalId as string,
    });

    this.logger?.info("allocation executed", {
      allocationId: allocation.id,
      period: input.period,
      amount: input.amount,
    });

    return allocation;
  }

  listRules(): AllocationRule[] {
    return this.repository.listAllocationRules();
  }

  listActiveRules(): AllocationRule[] {
    return this.repository.listActiveAllocationRules();
  }

  async deactivateRule(actorId: EntityId, ruleId: EntityId): Promise<AllocationRule> {
    const rule = this.repository.listAllocationRules().find(r => r.id === ruleId);
    if (!rule) throw new AllocationError(`Allocation rule ${ruleId} not found`);

    const updated: AllocationRule = {
      ...rule,
      active: false,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAllocationRule(updated);
    return updated;
  }
}
