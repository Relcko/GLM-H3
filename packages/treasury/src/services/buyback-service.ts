import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { TreasuryRepository } from "../repository";
import type { BuybackRequest, JournalEntry, LedgerEntry } from "../types";
import { BuybackStatus, JournalStatus, TreasuryEntryType, TreasuryAccountType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { BuybackError } from "../errors";
import { buybackSchema } from "../validation";
import type { z } from "zod";

type BuybackInput = z.infer<typeof buybackSchema>;

export default class BuybackService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
  ) {}

  async requestBuyback(actorId: EntityId, params: BuybackInput): Promise<BuybackRequest> {
    const data = buybackSchema.parse(params);
    const id = generateId("treasury") as EntityId;
    const now = new Date().toISOString();

    const request: BuybackRequest = {
      id,
      type: data.type,
      amount: data.amount,
      maxPrice: data.maxPrice,
      reason: data.reason,
      status: BuybackStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveBuybackRequest(request);

    await publishTreasuryEvent(this.events, TreasuryEventType.BuybackRequested, id, actorId, {
      requestId: id as string,
      type: data.type,
      amount: data.amount.amount.toString(),
      currency: data.amount.currency,
      reason: data.reason,
    });

    return request;
  }

  async approveBuyback(actorId: EntityId, requestId: EntityId): Promise<BuybackRequest> {
    const request = this.repository.getBuybackRequest(requestId);
    if (!request) throw new BuybackError(`Buyback request ${requestId} not found`, { requestId: requestId as string });

    if (request.status !== BuybackStatus.Pending) {
      throw new BuybackError(
        `Cannot approve buyback ${requestId} from status ${request.status}`,
        { requestId: requestId as string, currentStatus: request.status },
      );
    }

    const updated: BuybackRequest = {
      ...request,
      status: BuybackStatus.Approved,
      approvedBy: actorId,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveBuybackRequest(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.BuybackApproved, requestId, actorId, {
      requestId: requestId as string,
      approvedBy: actorId as string,
    });

    return updated;
  }

  async completeBuyback(actorId: EntityId, requestId: EntityId): Promise<BuybackRequest> {
    const request = this.repository.getBuybackRequest(requestId);
    if (!request) throw new BuybackError(`Buyback request ${requestId} not found`, { requestId: requestId as string });

    if (request.status !== BuybackStatus.Approved) {
      throw new BuybackError(
        `Cannot complete buyback ${requestId} from status ${request.status}`,
        { requestId: requestId as string, currentStatus: request.status },
      );
    }

    const now = new Date().toISOString();
    const finalAmount = request.amount.amount;

    const buybackAccounts = this.repository.listAccountsByType(TreasuryAccountType.BuybackReserve);
    const operatingAccounts = this.repository.listAccountsByType(TreasuryAccountType.Operating);

    if (buybackAccounts.length === 0) throw new BuybackError("No buyback reserve account found");
    if (operatingAccounts.length === 0) throw new BuybackError("No operating account found");

    const buybackAccount = buybackAccounts[0];
    const operatingAccount = operatingAccounts[0];

    const journalId = generateId("treasury") as EntityId;

    const debitEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: operatingAccount.id,
      entryType: TreasuryEntryType.Debit,
      amount: finalAmount,
      currency: operatingAccount.currency,
      balanceBefore: operatingAccount.balance,
      balanceAfter: operatingAccount.balance + finalAmount,
      description: `Buyback execution: ${request.reason}`,
      reference: "buyback",
      referenceId: requestId,
      createdAt: now,
    };

    const creditEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: buybackAccount.id,
      entryType: TreasuryEntryType.Credit,
      amount: finalAmount,
      currency: buybackAccount.currency,
      balanceBefore: buybackAccount.balance,
      balanceAfter: buybackAccount.balance - finalAmount,
      description: `Buyback execution: ${request.reason}`,
      reference: "buyback",
      referenceId: requestId,
      createdAt: now,
    };

    this.repository.saveAccount({
      ...buybackAccount,
      balance: buybackAccount.balance - finalAmount,
      availableBalance: buybackAccount.availableBalance - finalAmount,
      updatedAt: now,
    });

    this.repository.saveAccount({
      ...operatingAccount,
      balance: operatingAccount.balance + finalAmount,
      availableBalance: operatingAccount.availableBalance + finalAmount,
      updatedAt: now,
    });

    const journal: JournalEntry = {
      id: journalId,
      description: `Buyback execution: ${request.reason}`,
      status: JournalStatus.Posted,
      entries: [debitEntry, creditEntry],
      debitTotal: finalAmount,
      creditTotal: finalAmount,
      balanced: true,
      reference: "buyback",
      referenceId: requestId,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(debitEntry);
    this.repository.saveLedgerEntry(creditEntry);
    this.repository.saveJournal(journal);

    const updated: BuybackRequest = {
      ...request,
      status: BuybackStatus.Completed,
      executedAmount: { amount: finalAmount, currency: request.amount.currency },
      updatedAt: now,
    };

    this.repository.saveBuybackRequest(updated);

    const executedAmount = updated.executedAmount!;
    await publishTreasuryEvent(this.events, TreasuryEventType.BuybackCompleted, requestId, actorId, {
      requestId: requestId as string,
      executedAmount: executedAmount.amount.toString(),
      currency: executedAmount.currency,
    });

    return updated;
  }

  async cancelBuyback(actorId: EntityId, requestId: EntityId): Promise<BuybackRequest> {
    const request = this.repository.getBuybackRequest(requestId);
    if (!request) throw new BuybackError(`Buyback request ${requestId} not found`, { requestId: requestId as string });

    const updated: BuybackRequest = {
      ...request,
      status: BuybackStatus.Cancelled,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveBuybackRequest(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.BuybackCancelled, requestId, actorId, {
      requestId: requestId as string,
      previousStatus: request.status,
    });

    return updated;
  }

  getRequest(id: EntityId): BuybackRequest | undefined {
    return this.repository.getBuybackRequest(id);
  }

  listByStatus(status: BuybackStatus): BuybackRequest[] {
    return this.repository.listBuybacksByStatus(status);
  }
}
