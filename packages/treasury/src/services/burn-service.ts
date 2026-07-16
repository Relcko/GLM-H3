import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { TreasuryRepository } from "../repository";
import type { BurnRequest, JournalEntry, LedgerEntry } from "../types";
import { BurnStatus, JournalStatus, TreasuryEntryType, TreasuryAccountType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { BurnError } from "../errors";
import { burnSchema } from "../validation";
import type { z } from "zod";

type BurnInput = z.infer<typeof burnSchema>;

export default class BurnService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
  ) {}

  async requestBurn(actorId: EntityId, params: BurnInput): Promise<BurnRequest> {
    const data = burnSchema.parse(params);
    const id = generateId("treasury") as EntityId;

    const request: BurnRequest = {
      id,
      type: data.type,
      amount: data.amount,
      reason: data.reason,
      status: BurnStatus.Pending,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveBurnRequest(request);

    await publishTreasuryEvent(this.events, TreasuryEventType.BurnRequested, id, actorId, {
      requestId: id as string,
      type: data.type,
      amount: data.amount.toString(),
      reason: data.reason,
    });

    return request;
  }

  async approveBurn(actorId: EntityId, requestId: EntityId): Promise<BurnRequest> {
    const request = this.repository.getBurnRequest(requestId);
    if (!request) throw new BurnError(`Burn request ${requestId} not found`, { requestId: requestId as string });

    if (request.status !== BurnStatus.Pending) {
      throw new BurnError(
        `Cannot approve burn ${requestId} from status ${request.status}`,
        { requestId: requestId as string, currentStatus: request.status },
      );
    }

    const updated: BurnRequest = {
      ...request,
      status: BurnStatus.Approved,
      approvedBy: actorId,
    };

    this.repository.saveBurnRequest(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.BurnApproved, requestId, actorId, {
      requestId: requestId as string,
      approvedBy: actorId as string,
    });

    return updated;
  }

  async completeBurn(actorId: EntityId, requestId: EntityId): Promise<BurnRequest> {
    const request = this.repository.getBurnRequest(requestId);
    if (!request) throw new BurnError(`Burn request ${requestId} not found`, { requestId: requestId as string });

    if (request.status !== BurnStatus.Approved) {
      throw new BurnError(
        `Cannot complete burn ${requestId} from status ${request.status}`,
        { requestId: requestId as string, currentStatus: request.status },
      );
    }

    const now = new Date().toISOString();
    const amount = request.amount;

    const equityAccounts = this.repository.listAccountsByType(TreasuryAccountType.Equity);
    const assetAccounts = this.repository.listAccountsByType(TreasuryAccountType.Asset);

    if (equityAccounts.length === 0) throw new BurnError("No equity account found");
    if (assetAccounts.length === 0) throw new BurnError("No asset account found");

    const equityAccount = equityAccounts[0];
    const assetAccount = assetAccounts[0];

    const journalId = generateId("treasury") as EntityId;

    const debitEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: assetAccount.id,
      entryType: TreasuryEntryType.Debit,
      amount,
      currency: assetAccount.currency,
      balanceBefore: assetAccount.balance,
      balanceAfter: assetAccount.balance + amount,
      description: `Token burn: ${request.reason}`,
      reference: "burn",
      referenceId: requestId,
      createdAt: now,
    };

    const creditEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: equityAccount.id,
      entryType: TreasuryEntryType.Credit,
      amount,
      currency: equityAccount.currency,
      balanceBefore: equityAccount.balance,
      balanceAfter: equityAccount.balance - amount,
      description: `Token burn: ${request.reason}`,
      reference: "burn",
      referenceId: requestId,
      createdAt: now,
    };

    this.repository.saveAccount({
      ...equityAccount,
      balance: equityAccount.balance - amount,
      availableBalance: equityAccount.availableBalance - amount,
      updatedAt: now,
    });

    this.repository.saveAccount({
      ...assetAccount,
      balance: assetAccount.balance + amount,
      availableBalance: assetAccount.availableBalance + amount,
      updatedAt: now,
    });

    const journal: JournalEntry = {
      id: journalId,
      description: `Token burn: ${request.reason}`,
      status: JournalStatus.Posted,
      entries: [debitEntry, creditEntry],
      debitTotal: amount,
      creditTotal: amount,
      balanced: true,
      reference: "burn",
      referenceId: requestId,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(debitEntry);
    this.repository.saveLedgerEntry(creditEntry);
    this.repository.saveJournal(journal);

    const updated: BurnRequest = {
      ...request,
      status: BurnStatus.Completed,
      executedAt: now,
    };

    this.repository.saveBurnRequest(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.BurnCompleted, requestId, actorId, {
      requestId: requestId as string,
      amount: amount.toString(),
    });

    return updated;
  }

  async cancelBurn(actorId: EntityId, requestId: EntityId): Promise<BurnRequest> {
    const request = this.repository.getBurnRequest(requestId);
    if (!request) throw new BurnError(`Burn request ${requestId} not found`, { requestId: requestId as string });

    const updated: BurnRequest = {
      ...request,
      status: BurnStatus.Cancelled,
    };

    this.repository.saveBurnRequest(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.BurnCancelled, requestId, actorId, {
      requestId: requestId as string,
      previousStatus: request.status,
    });

    return updated;
  }

  getRequest(id: EntityId): BurnRequest | undefined {
    return this.repository.getBurnRequest(id);
  }

  listByStatus(status: BurnStatus): BurnRequest[] {
    return this.repository.listBurnsByStatus(status);
  }
}
