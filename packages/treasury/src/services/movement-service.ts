import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { MovementRequest, JournalEntry, LedgerEntry, MultiSigConfig, MultiSigSignature, DepositRequest, WithdrawalRequest, RebalancePlan, YieldRecord } from "../types";
import { MovementStatus, JournalStatus, TreasuryEntryType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { MovementError, AccountNotFoundError, MultiSigError, YieldError } from "../errors";
import { movementSchema } from "../validation";
import type { z } from "zod";

type CreateMovementInput = z.infer<typeof movementSchema>;

export default class MovementService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async createMovement(actorId: EntityId, params: CreateMovementInput): Promise<MovementRequest> {
    const parsed = movementSchema.parse(params);

    const sourceAccount = this.repository.getAccount(parsed.fromAccountId as EntityId);
    if (!sourceAccount) throw new AccountNotFoundError(parsed.fromAccountId);

    const destAccount = this.repository.getAccount(parsed.toAccountId as EntityId);
    if (!destAccount) throw new AccountNotFoundError(parsed.toAccountId);

    if (sourceAccount.availableBalance < parsed.amount.amount) {
      throw new MovementError(
        `Insufficient available balance in source account ${parsed.fromAccountId}`,
      );
    }

    const now = new Date().toISOString();

    const movement: MovementRequest = {
      id: generateId("treasury") as EntityId,
      fromAccountId: parsed.fromAccountId as EntityId,
      toAccountId: parsed.toAccountId as EntityId,
      amount: { amount: parsed.amount.amount, currency: parsed.amount.currency as Currency },
      reason: parsed.reason,
      status: MovementStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveMovement(movement);

    await publishTreasuryEvent(this.events, TreasuryEventType.MovementCreated, movement.id, actorId, {
      movementId: movement.id as string,
      fromAccountId: parsed.fromAccountId,
      toAccountId: parsed.toAccountId,
      amount: String(parsed.amount.amount),
    });

    this.logger?.info("movement created", { movementId: movement.id });
    return movement;
  }

  async approveMovement(actorId: EntityId, movementId: EntityId, approverId: EntityId): Promise<MovementRequest> {
    const movement = this.getMovementOrThrow(movementId);

    if (movement.status !== MovementStatus.Pending) {
      throw new MovementError(`Cannot approve movement ${movementId} with status ${movement.status}`);
    }

    const config = this.repository.getMultiSigConfig(movement.fromAccountId);

    if (!config) {
      const updated: MovementRequest = {
        ...movement,
        status: MovementStatus.Approved,
        approvedBy: approverId,
        updatedAt: new Date().toISOString(),
      };
      this.repository.saveMovement(updated);

      await publishTreasuryEvent(this.events, TreasuryEventType.MovementApproved, movementId, actorId, {
        movementId: movementId as string,
        approverId: approverId as string,
      });

      this.logger?.info("movement approved (single-signer)", { movementId, approverId });
      return updated;
    }

    if (!config.signerIds.includes(approverId)) {
      throw new MultiSigError(`Signer ${approverId} is not authorized for account ${movement.fromAccountId}`);
    }

    if (this.repository.hasSignerSigned(movementId, approverId)) {
      throw new MultiSigError(`Signer ${approverId} has already signed movement ${movementId}`);
    }

    const signature: MultiSigSignature = {
      id: generateId("msig") as EntityId,
      movementId,
      signerId: approverId,
      signedAt: new Date().toISOString(),
    };
    this.repository.saveSignature(signature);

    const signatures = this.repository.getSignaturesByMovement(movementId);

    if (signatures.length >= config.threshold) {
      const updated: MovementRequest = {
        ...movement,
        status: MovementStatus.Approved,
        approvedBy: approverId,
        updatedAt: new Date().toISOString(),
      };
      this.repository.saveMovement(updated);

      await publishTreasuryEvent(this.events, TreasuryEventType.MovementApprovedMultiSig, movementId, actorId, {
        movementId: movementId as string,
        approverId: approverId as string,
        signatureCount: signatures.length,
        threshold: config.threshold,
      });

      this.logger?.info("movement approved (multi-sig quorum reached)", {
        movementId,
        approverId,
        signatureCount: signatures.length,
        threshold: config.threshold,
      });
      return updated;
    }

    this.logger?.info("multi-sig signature recorded (quorum not yet reached)", {
      movementId,
      approverId,
      signatureCount: signatures.length,
      threshold: config.threshold,
    });

    return movement;
  }

  async completeMovement(actorId: EntityId, movementId: EntityId): Promise<MovementRequest> {
    const movement = this.getMovementOrThrow(movementId);

    if (movement.status !== MovementStatus.Approved) {
      throw new MovementError(`Cannot complete movement ${movementId} with status ${movement.status}`);
    }

    const sourceAccount = this.repository.getAccount(movement.fromAccountId);
    if (!sourceAccount) throw new AccountNotFoundError(movement.fromAccountId as string);

    const destAccount = this.repository.getAccount(movement.toAccountId);
    if (!destAccount) throw new AccountNotFoundError(movement.toAccountId as string);

    if (sourceAccount.availableBalance < movement.amount.amount) {
      throw new MovementError(
        `Insufficient available balance in source account ${movement.fromAccountId} to complete movement`,
      );
    }

    const now = new Date().toISOString();
    const journalId = generateId("treasury") as EntityId;

    const sourceBalanceBefore = sourceAccount.balance;
    const sourceBalanceAfter = sourceAccount.balance - movement.amount.amount;

    this.repository.saveAccount({
      ...sourceAccount,
      balance: sourceBalanceAfter,
      availableBalance: sourceAccount.availableBalance - movement.amount.amount,
      updatedAt: now,
    });

    const destBalanceBefore = destAccount.balance;
    const destBalanceAfter = destAccount.balance + movement.amount.amount;

    this.repository.saveAccount({
      ...destAccount,
      balance: destBalanceAfter,
      availableBalance: destAccount.availableBalance + movement.amount.amount,
      updatedAt: now,
    });

    const entries: LedgerEntry[] = [
      {
        id: generateId("treasury") as EntityId,
        journalId,
        accountId: movement.fromAccountId,
        entryType: TreasuryEntryType.Credit,
        amount: movement.amount.amount,
        currency: movement.amount.currency,
        balanceBefore: sourceBalanceBefore,
        balanceAfter: sourceBalanceAfter,
        description: `Movement from ${sourceAccount.name} to ${destAccount.name}`,
        reference: `MOV_${movementId}`,
        referenceId: movementId,
        createdAt: now,
      },
      {
        id: generateId("treasury") as EntityId,
        journalId,
        accountId: movement.toAccountId,
        entryType: TreasuryEntryType.Debit,
        amount: movement.amount.amount,
        currency: movement.amount.currency,
        balanceBefore: destBalanceBefore,
        balanceAfter: destBalanceAfter,
        description: `Movement from ${sourceAccount.name} to ${destAccount.name}`,
        reference: `MOV_${movementId}`,
        referenceId: movementId,
        createdAt: now,
      },
    ];

    const journal: JournalEntry = {
      id: journalId,
      description: `Funds movement ${movementId}: ${movement.reason}`,
      status: JournalStatus.Posted,
      entries,
      debitTotal: movement.amount.amount,
      creditTotal: movement.amount.amount,
      balanced: true,
      reference: `MOV_${movementId}`,
      referenceId: movementId,
      postedAt: now,
      createdAt: now,
    };

    for (const entry of entries) {
      this.repository.saveLedgerEntry(entry);
    }
    this.repository.saveJournal(journal);

    const updated: MovementRequest = {
      ...movement,
      status: MovementStatus.Completed,
      journalId,
      updatedAt: now,
    };

    this.repository.saveMovement(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.MovementCompleted, movementId, actorId, {
      movementId: movementId as string,
      journalId: journalId as string,
      fromAccountId: movement.fromAccountId as string,
      toAccountId: movement.toAccountId as string,
      amount: String(movement.amount.amount),
    });

    this.logger?.info("movement completed", { movementId, journalId });
    return updated;
  }

  async rejectMovement(actorId: EntityId, movementId: EntityId, reason: string): Promise<MovementRequest> {
    const movement = this.getMovementOrThrow(movementId);

    if (movement.status !== MovementStatus.Pending) {
      throw new MovementError(`Cannot reject movement ${movementId} with status ${movement.status}`);
    }

    const updated: MovementRequest = {
      ...movement,
      status: MovementStatus.Rejected,
      reason,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveMovement(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.MovementRejected, movementId, actorId, {
      movementId: movementId as string,
      reason,
      previousStatus: movement.status,
    });

    return updated;
  }

  createMultiSigConfig(actorId: EntityId, accountId: EntityId, signerIds: EntityId[], threshold: number): MultiSigConfig {
    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);
    if (threshold <= 0 || threshold > signerIds.length) {
      throw new MultiSigError(`Threshold ${threshold} must be > 0 and <= signer count ${signerIds.length}`);
    }
    if (new Set(signerIds).size !== signerIds.length) {
      throw new MultiSigError("Duplicate signers are not allowed");
    }

    const config: MultiSigConfig = {
      id: generateId("msig-config") as EntityId,
      accountId,
      signerIds,
      threshold,
      createdAt: new Date().toISOString(),
    };
    this.repository.saveMultiSigConfig(config);

    this.logger?.info("multi-sig config created", { accountId, threshold, signerCount: signerIds.length });
    return config;
  }

  async deposit(actorId: EntityId, input: DepositRequest): Promise<MovementRequest> {
    const account = this.repository.getAccount(input.accountId);
    if (!account) throw new AccountNotFoundError(input.accountId as string);

    const now = new Date().toISOString();
    const movement: MovementRequest = {
      id: generateId("treasury") as EntityId,
      fromAccountId: "EXTERNAL" as EntityId,
      toAccountId: input.accountId,
      amount: input.amount,
      reason: `Deposit from ${input.source}` + (input.txHash ? ` (tx: ${input.txHash})` : ""),
      status: MovementStatus.Completed,
      createdAt: now,
      updatedAt: now,
    };

    const journalId = generateId("treasury") as EntityId;
    const balanceBefore = account.balance;
    const balanceAfter = account.balance + input.amount.amount;

    this.repository.saveAccount({ ...account, balance: balanceAfter, availableBalance: account.availableBalance + input.amount.amount, updatedAt: now });

    const entry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: input.accountId,
      entryType: TreasuryEntryType.Debit,
      amount: input.amount.amount,
      currency: input.amount.currency,
      balanceBefore,
      balanceAfter,
      description: `Deposit from ${input.source}`,
      reference: `DEP_${movement.id}`,
      referenceId: movement.id,
      createdAt: now,
    };

    const journal: JournalEntry = {
      id: journalId,
      description: `Deposit: ${input.source}`,
      status: JournalStatus.Posted,
      entries: [entry],
      debitTotal: input.amount.amount,
      creditTotal: input.amount.amount,
      balanced: true,
      reference: `DEP_${movement.id}`,
      referenceId: movement.id,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(entry);
    this.repository.saveJournal(journal);
    this.repository.saveMovement({ ...movement, journalId });

    await publishTreasuryEvent(this.events, TreasuryEventType.TreasuryDeposit, movement.id, actorId, {
      movementId: movement.id as string,
      accountId: input.accountId as string,
      amount: input.amount.amount.toString(),
      currency: input.amount.currency,
      source: input.source,
    });

    this.logger?.info("deposit recorded", { movementId: movement.id, accountId: input.accountId, amount: input.amount.amount.toString() });
    return movement;
  }

  async withdraw(actorId: EntityId, input: WithdrawalRequest): Promise<MovementRequest> {
    const account = this.repository.getAccount(input.accountId);
    if (!account) throw new AccountNotFoundError(input.accountId as string);

    if (account.availableBalance < input.amount.amount) {
      throw new MovementError(`Insufficient available balance in account ${input.accountId}`);
    }

    const now = new Date().toISOString();
    const movement: MovementRequest = {
      id: generateId("treasury") as EntityId,
      fromAccountId: input.accountId,
      toAccountId: "EXTERNAL" as EntityId,
      amount: input.amount,
      reason: input.reason,
      status: MovementStatus.Completed,
      createdAt: now,
      updatedAt: now,
    };

    const journalId = generateId("treasury") as EntityId;
    const balanceBefore = account.balance;
    const balanceAfter = account.balance - input.amount.amount;

    this.repository.saveAccount({ ...account, balance: balanceAfter, availableBalance: account.availableBalance - input.amount.amount, updatedAt: now });

    const entry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: input.accountId,
      entryType: TreasuryEntryType.Credit,
      amount: input.amount.amount,
      currency: input.amount.currency,
      balanceBefore,
      balanceAfter,
      description: `Withdrawal to ${input.destination}: ${input.reason}`,
      reference: `WDR_${movement.id}`,
      referenceId: movement.id,
      createdAt: now,
    };

    const journal: JournalEntry = {
      id: journalId,
      description: `Withdrawal: ${input.reason}`,
      status: JournalStatus.Posted,
      entries: [entry],
      debitTotal: input.amount.amount,
      creditTotal: input.amount.amount,
      balanced: true,
      reference: `WDR_${movement.id}`,
      referenceId: movement.id,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(entry);
    this.repository.saveJournal(journal);
    this.repository.saveMovement({ ...movement, journalId });

    await publishTreasuryEvent(this.events, TreasuryEventType.TreasuryWithdrawal, movement.id, actorId, {
      movementId: movement.id as string,
      accountId: input.accountId as string,
      amount: input.amount.amount.toString(),
      currency: input.amount.currency,
      destination: input.destination,
    });

    this.logger?.info("withdrawal recorded", { movementId: movement.id, accountId: input.accountId, amount: input.amount.amount.toString() });
    return movement;
  }

  async rebalance(actorId: EntityId, plan: RebalancePlan): Promise<MovementRequest[]> {
    const movements: MovementRequest[] = [];
    const now = new Date().toISOString();

    for (const transfer of plan.transfers) {
      const sourceAccount = this.repository.getAccount(transfer.fromAccountId);
      if (!sourceAccount) throw new AccountNotFoundError(transfer.fromAccountId as string);

      const destAccount = this.repository.getAccount(transfer.toAccountId);
      if (!destAccount) throw new AccountNotFoundError(transfer.toAccountId as string);

      if (sourceAccount.availableBalance < transfer.amount.amount) {
        throw new MovementError(`Insufficient balance in ${transfer.fromAccountId} for rebalance`);
      }

      const movement: MovementRequest = {
        id: generateId("treasury") as EntityId,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount,
        reason: `Rebalance: ${plan.reason}`,
        status: MovementStatus.Completed,
        createdAt: now,
        updatedAt: now,
      };

      const journalId = generateId("treasury") as EntityId;

      const srcBalanceBefore = sourceAccount.balance;
      const srcBalanceAfter = sourceAccount.balance - transfer.amount.amount;
      this.repository.saveAccount({ ...sourceAccount, balance: srcBalanceAfter, availableBalance: sourceAccount.availableBalance - transfer.amount.amount, updatedAt: now });

      const dstBalanceBefore = destAccount.balance;
      const dstBalanceAfter = destAccount.balance + transfer.amount.amount;
      this.repository.saveAccount({ ...destAccount, balance: dstBalanceAfter, availableBalance: destAccount.availableBalance + transfer.amount.amount, updatedAt: now });

      const entries: LedgerEntry[] = [
        {
          id: generateId("treasury") as EntityId,
          journalId,
          accountId: transfer.fromAccountId,
          entryType: TreasuryEntryType.Credit,
          amount: transfer.amount.amount,
          currency: transfer.amount.currency,
          balanceBefore: srcBalanceBefore,
          balanceAfter: srcBalanceAfter,
          description: `Rebalance to ${transfer.toAccountId}`,
          reference: `RBL_${movement.id}`,
          referenceId: movement.id,
          createdAt: now,
        },
        {
          id: generateId("treasury") as EntityId,
          journalId,
          accountId: transfer.toAccountId,
          entryType: TreasuryEntryType.Debit,
          amount: transfer.amount.amount,
          currency: transfer.amount.currency,
          balanceBefore: dstBalanceBefore,
          balanceAfter: dstBalanceAfter,
          description: `Rebalance from ${transfer.fromAccountId}`,
          reference: `RBL_${movement.id}`,
          referenceId: movement.id,
          createdAt: now,
        },
      ];

      const journal: JournalEntry = {
        id: journalId,
        description: `Rebalance: ${plan.reason}`,
        status: JournalStatus.Posted,
        entries,
        debitTotal: transfer.amount.amount,
        creditTotal: transfer.amount.amount,
        balanced: true,
        reference: `RBL_${movement.id}`,
        referenceId: movement.id,
        postedAt: now,
        createdAt: now,
      };

      for (const e of entries) { this.repository.saveLedgerEntry(e); }
      this.repository.saveJournal(journal);
      this.repository.saveMovement({ ...movement, journalId });
      movements.push(movement);

      await publishTreasuryEvent(this.events, TreasuryEventType.TreasuryRebalanced, movement.id, actorId, {
        movementId: movement.id as string,
        fromAccountId: transfer.fromAccountId as string,
        toAccountId: transfer.toAccountId as string,
        amount: transfer.amount.amount.toString(),
        currency: transfer.amount.currency,
        reason: plan.reason,
      });
    }

    this.logger?.info("rebalance executed", { transferCount: movements.length, reason: plan.reason });
    return movements;
  }

  async recordYield(actorId: EntityId, input: {
    treasuryAccountId: EntityId;
    source: string;
    asset: string;
    principalAmount: bigint;
    yieldAmount: bigint;
    currency: Currency;
    reference: string;
    metadata?: Record<string, unknown>;
  }): Promise<YieldRecord> {
    const account = this.repository.getAccount(input.treasuryAccountId);
    if (!account) throw new AccountNotFoundError(input.treasuryAccountId as string);

    if (input.yieldAmount <= 0n) {
      throw new YieldError("yieldAmount must be > 0", { reference: input.reference });
    }

    const refKey = `yield:${input.reference}`;
    if (this.repository.isYieldReferenceProcessed(refKey)) {
      this.logger?.info("duplicate yield reference skipped", { reference: input.reference });
      throw new YieldError(`Yield reference ${input.reference} already processed`, { reference: input.reference });
    }

    const now = new Date().toISOString();
    const yieldAmountMoney: Money = { amount: input.yieldAmount, currency: input.currency };
    const principalAmountMoney: Money = { amount: input.principalAmount, currency: input.currency };

    const record: YieldRecord = {
      id: generateId("yield") as EntityId,
      treasuryAccountId: input.treasuryAccountId,
      source: input.source,
      asset: input.asset,
      principalAmount: principalAmountMoney,
      yieldAmount: yieldAmountMoney,
      currency: input.currency,
      realizedAt: now,
      reference: input.reference,
      metadata: input.metadata,
    };

    const journalId = generateId("treasury") as EntityId;
    const balanceBefore = account.balance;
    const balanceAfter = account.balance + input.yieldAmount;

    this.repository.saveAccount({
      ...account,
      balance: balanceAfter,
      availableBalance: account.availableBalance + input.yieldAmount,
      updatedAt: now,
    });

    const entry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: input.treasuryAccountId,
      entryType: TreasuryEntryType.Debit,
      amount: input.yieldAmount,
      currency: input.currency,
      balanceBefore,
      balanceAfter,
      description: `Yield from ${input.source} (${input.asset})`,
      reference: `YLD_${record.id}`,
      referenceId: record.id,
      createdAt: now,
    };

    const journal: JournalEntry = {
      id: journalId,
      description: `Yield realized: ${input.source}`,
      status: JournalStatus.Posted,
      entries: [entry],
      debitTotal: input.yieldAmount,
      creditTotal: input.yieldAmount,
      balanced: true,
      reference: `YLD_${record.id}`,
      referenceId: record.id,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(entry);
    this.repository.saveJournal(journal);
    this.repository.saveYieldRecord(record);
    this.repository.markYieldReference(refKey);

    await publishTreasuryEvent(this.events, TreasuryEventType.TreasuryYieldRealized, record.id, actorId, {
      yieldRecordId: record.id as string,
      treasuryAccountId: input.treasuryAccountId as string,
      source: input.source,
      asset: input.asset,
      principalAmount: input.principalAmount.toString(),
      yieldAmount: input.yieldAmount.toString(),
      currency: input.currency,
      reference: input.reference,
    });

    this.logger?.info("yield recorded", {
      yieldId: record.id,
      accountId: input.treasuryAccountId,
      source: input.source,
      amount: input.yieldAmount.toString(),
    });

    return record;
  }

  getMovement(id: EntityId): MovementRequest | undefined {
    return this.repository.getMovement(id);
  }

  listByStatus(status: MovementStatus): MovementRequest[] {
    return this.repository.listMovementsByStatus(status);
  }

  private getMovementOrThrow(id: EntityId): MovementRequest {
    const movement = this.repository.getMovement(id);
    if (!movement) throw new MovementError(`Movement ${id} not found`);
    return movement;
  }
}
