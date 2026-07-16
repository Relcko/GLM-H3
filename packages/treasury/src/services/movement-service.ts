import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { MovementRequest, JournalEntry, LedgerEntry } from "../types";
import { MovementStatus, JournalStatus, TreasuryEntryType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { MovementError, AccountNotFoundError } from "../errors";
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

    this.logger?.info("movement approved", { movementId, approverId });
    return updated;
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
