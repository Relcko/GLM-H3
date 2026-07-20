import { generateId } from "@relcko/utils";
import type { EntityId, Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { TreasuryRepository } from "../repository";
import type { PortfolioAdapter } from "./portfolio-adapter";
import type {
  DividendProposal, DividendEligibilityEntry, DividendDistributionEntry, DividendRecoveryEntry,
  JournalEntry, LedgerEntry,
} from "../types";
import {
  DividendStatus, JournalStatus, TreasuryEntryType, TreasuryAccountType,
} from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { DividendError } from "../errors";
import { dividendProposalSchema } from "../validation";
import type { z } from "zod";

type DividendProposalInput = z.infer<typeof dividendProposalSchema>;

export default class DividendService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly portfolioAdapter: PortfolioAdapter,
  ) {}

  async proposeDividend(actorId: EntityId, params: DividendProposalInput): Promise<DividendProposal> {
    const data = dividendProposalSchema.parse(params);

    const id = generateId("treasury") as EntityId;

    const proposal: DividendProposal = {
      id,
      period: data.period,
      totalAmount: data.totalAmount,
      perUnitAmount: data.perUnitAmount,
      eligibleUnits: data.eligibleUnits,
      totalDistributed: { amount: 0n, currency: data.totalAmount.currency },
      status: DividendStatus.Pending,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveDividendProposal(proposal);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendProposed, id, actorId, {
      proposalId: id as string,
      period: data.period,
      totalAmount: data.totalAmount.amount.toString(),
      currency: data.totalAmount.currency,
    });

    return proposal;
  }

  async approveDividend(actorId: EntityId, proposalId: EntityId): Promise<DividendProposal> {
    const proposal = this.repository.getDividendProposal(proposalId);
    if (!proposal) throw new DividendError(`Dividend proposal ${proposalId} not found`, { proposalId: proposalId as string });

    if (proposal.status !== DividendStatus.Pending) {
      throw new DividendError(
        `Cannot approve dividend ${proposalId} from status ${proposal.status}`,
        { proposalId: proposalId as string, currentStatus: proposal.status },
      );
    }

    const updated: DividendProposal = {
      ...proposal,
      status: DividendStatus.Approved,
      approvedAt: new Date().toISOString(),
    };

    this.repository.saveDividendProposal(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendApproved, proposalId, actorId, {
      proposalId: proposalId as string,
    });

    return updated;
  }

  async distributeDividend(actorId: EntityId, proposalId: EntityId): Promise<DividendProposal> {
    const proposal = this.repository.getDividendProposal(proposalId);
    if (!proposal) throw new DividendError(`Dividend proposal ${proposalId} not found`, { proposalId: proposalId as string });

    if (proposal.status !== DividendStatus.Approved) {
      throw new DividendError(
        `Cannot distribute dividend ${proposalId} from status ${proposal.status}`,
        { proposalId: proposalId as string, currentStatus: proposal.status },
      );
    }

    const expectedTotal = proposal.perUnitAmount.amount * proposal.eligibleUnits;
    if (expectedTotal !== proposal.totalAmount.amount) {
      const failed: DividendProposal = { ...proposal, status: DividendStatus.Failed };
      this.repository.saveDividendProposal(failed);
      await publishTreasuryEvent(this.events, TreasuryEventType.DividendRejected, proposalId, actorId, {
        proposalId: proposalId as string,
        reason: "reconciliation_mismatch",
        details: `perUnitAmount (${proposal.perUnitAmount.amount}) × eligibleUnits (${proposal.eligibleUnits}) = ${expectedTotal} !== approvedTotalAmount (${proposal.totalAmount.amount})`,
      });
      throw new DividendError(
        `Dividend reconciliation failed: perUnitAmount (${proposal.perUnitAmount.amount}) × eligibleUnits (${proposal.eligibleUnits}) = ${expectedTotal} !== approvedTotalAmount (${proposal.totalAmount.amount})`,
        { proposalId: proposalId as string, expectedTotal: String(expectedTotal), approvedTotal: String(proposal.totalAmount.amount) },
      );
    }

    const operatingAccounts = this.repository.listAccountsByType(TreasuryAccountType.Operating);
    if (operatingAccounts.length === 0) throw new DividendError("No operating account found");
    const treasuryAccount = operatingAccounts[0];
    if (treasuryAccount.availableBalance < proposal.totalAmount.amount) {
      const failed: DividendProposal = { ...proposal, status: DividendStatus.Failed };
      this.repository.saveDividendProposal(failed);
      await publishTreasuryEvent(this.events, TreasuryEventType.DividendRejected, proposalId, actorId, {
        proposalId: proposalId as string,
        reason: "insufficient_balance",
        details: `${String(treasuryAccount.availableBalance)} < ${String(proposal.totalAmount.amount)}`,
      });
      throw new DividendError(
        `Insufficient Treasury balance: ${String(treasuryAccount.availableBalance)} < ${String(proposal.totalAmount.amount)}`,
        { available: String(treasuryAccount.availableBalance), required: String(proposal.totalAmount.amount) },
      );
    }

    const investors = await this.portfolioAdapter.getEligibleInvestors(proposalId);

    let totalDistributedAmount = 0n;
    const now = new Date().toISOString();

    for (const inv of investors) {
      const amount = proposal.perUnitAmount.amount * inv.units;
      totalDistributedAmount += amount;

      const eligibility: DividendEligibilityEntry = {
        id: generateId("treasury") as EntityId,
        dividendId: proposalId,
        investorId: inv.investorId as EntityId,
        units: inv.units,
        amount: { amount, currency: proposal.totalAmount.currency },
        qualified: true,
        createdAt: now,
      };
      this.repository.saveDividendEligibility(eligibility);

      const distribution: DividendDistributionEntry = {
        id: generateId("treasury") as EntityId,
        dividendId: proposalId,
        investorId: inv.investorId as EntityId,
        amount: { amount, currency: proposal.totalAmount.currency },
        status: DividendStatus.Distributed,
        distributedAt: now,
        createdAt: now,
      };
      this.repository.saveDividendDistribution(distribution);
    }

    const dividendAccounts = this.repository.listAccountsByType(TreasuryAccountType.Dividend);
    if (dividendAccounts.length === 0) throw new DividendError("No dividend account found");

    const dividendAccount = dividendAccounts[0];
    const operatingAccount = treasuryAccount;

    const journalId = generateId("treasury") as EntityId;

    const debitEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: dividendAccount.id,
      entryType: TreasuryEntryType.Debit,
      amount: totalDistributedAmount,
      currency: dividendAccount.currency,
      balanceBefore: dividendAccount.balance,
      balanceAfter: dividendAccount.balance + totalDistributedAmount,
      description: `Dividend distribution for period ${proposal.period}`,
      reference: "dividend_distribution",
      referenceId: proposalId,
      createdAt: now,
    };

    const creditEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: operatingAccount.id,
      entryType: TreasuryEntryType.Credit,
      amount: totalDistributedAmount,
      currency: operatingAccount.currency,
      balanceBefore: operatingAccount.balance,
      balanceAfter: operatingAccount.balance - totalDistributedAmount,
      description: `Dividend distribution for period ${proposal.period}`,
      reference: "dividend_distribution",
      referenceId: proposalId,
      createdAt: now,
    };

    this.repository.saveAccount({
      ...dividendAccount,
      balance: dividendAccount.balance + totalDistributedAmount,
      availableBalance: dividendAccount.availableBalance + totalDistributedAmount,
      updatedAt: now,
    });

    this.repository.saveAccount({
      ...operatingAccount,
      balance: operatingAccount.balance - totalDistributedAmount,
      availableBalance: operatingAccount.availableBalance - totalDistributedAmount,
      updatedAt: now,
    });

    const journal: JournalEntry = {
      id: journalId,
      description: `Dividend distribution for period ${proposal.period}`,
      status: JournalStatus.Posted,
      entries: [debitEntry, creditEntry],
      debitTotal: totalDistributedAmount,
      creditTotal: totalDistributedAmount,
      balanced: true,
      reference: "dividend_distribution",
      referenceId: proposalId,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(debitEntry);
    this.repository.saveLedgerEntry(creditEntry);
    this.repository.saveJournal(journal);

    const updated: DividendProposal = {
      ...proposal,
      totalDistributed: { amount: totalDistributedAmount, currency: proposal.totalAmount.currency },
      status: DividendStatus.Distributed,
      distributedAt: now,
    };

    this.repository.saveDividendProposal(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendDistributed, proposalId, actorId, {
      proposalId: proposalId as string,
      totalDistributed: updated.totalDistributed.amount.toString(),
      currency: updated.totalDistributed.currency,
      investorCount: investors.length,
    });

    return updated;
  }

  async recoverDividend(
    actorId: EntityId,
    proposalId: EntityId,
    distributionId: EntityId,
    investorId: EntityId,
    reason: string,
  ): Promise<DividendRecoveryEntry> {
    const proposal = this.repository.getDividendProposal(proposalId);
    if (!proposal) throw new DividendError(`Dividend proposal ${proposalId} not found`, { proposalId: proposalId as string });

    const distributions = this.repository.listDistributionsByDividend(proposalId);
    const distribution = distributions.find(d => d.id === distributionId);
    if (!distribution) throw new DividendError(`Distribution ${distributionId} not found`, { distributionId: distributionId as string });

    const existingRecoveries = this.repository.listRecoveriesByDividend(proposalId);
    const alreadyRecovered = existingRecoveries.some(
      r => r.distributionId === distributionId && r.investorId === investorId,
    );
    if (alreadyRecovered) {
      throw new DividendError(
        `Dividend distribution ${distributionId} for investor ${investorId} has already been recovered`,
        { distributionId: distributionId as string, investorId: investorId as string },
      );
    }

    const now = new Date().toISOString();

    const recovery: DividendRecoveryEntry = {
      id: generateId("treasury") as EntityId,
      dividendId: proposalId,
      distributionId,
      investorId,
      amount: distribution.amount,
      reason,
      recoveredAt: now,
    };

    this.repository.saveDividendRecovery(recovery);

    const dividendAccounts = this.repository.listAccountsByType(TreasuryAccountType.Dividend);
    if (dividendAccounts.length === 0) throw new DividendError("No dividend account found");

    const dividendAccount = dividendAccounts[0];
    const operatingAccounts = this.repository.listAccountsByType(TreasuryAccountType.Operating);
    if (operatingAccounts.length === 0) throw new DividendError("No operating account found");

    const operatingAccount = operatingAccounts[0];
    const recoveryAmount = distribution.amount.amount;

    const journalId = generateId("treasury") as EntityId;

    const creditEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: dividendAccount.id,
      entryType: TreasuryEntryType.Credit,
      amount: recoveryAmount,
      currency: dividendAccount.currency,
      balanceBefore: dividendAccount.balance,
      balanceAfter: dividendAccount.balance - recoveryAmount,
      description: `Dividend recovery: ${reason}`,
      reference: "dividend_recovery",
      referenceId: proposalId,
      createdAt: now as unknown as LedgerEntry["createdAt"],
    };

    const debitEntry: LedgerEntry = {
      id: generateId("treasury") as EntityId,
      journalId,
      accountId: operatingAccount.id,
      entryType: TreasuryEntryType.Debit,
      amount: recoveryAmount,
      currency: operatingAccount.currency,
      balanceBefore: operatingAccount.balance,
      balanceAfter: operatingAccount.balance + recoveryAmount,
      description: `Dividend recovery: ${reason}`,
      reference: "dividend_recovery",
      referenceId: proposalId,
      createdAt: now,
    };

    this.repository.saveAccount({
      ...dividendAccount,
      balance: dividendAccount.balance - recoveryAmount,
      availableBalance: dividendAccount.availableBalance - recoveryAmount,
      updatedAt: now,
    });

    this.repository.saveAccount({
      ...operatingAccount,
      balance: operatingAccount.balance + recoveryAmount,
      availableBalance: operatingAccount.availableBalance + recoveryAmount,
      updatedAt: now,
    });

    const journal: JournalEntry = {
      id: journalId,
      description: `Dividend recovery for distribution ${distributionId}`,
      status: JournalStatus.Posted,
      entries: [creditEntry, debitEntry],
      debitTotal: recoveryAmount,
      creditTotal: recoveryAmount,
      balanced: true,
      reference: "dividend_recovery",
      referenceId: proposalId,
      postedAt: now,
      createdAt: now,
    };

    this.repository.saveLedgerEntry(creditEntry);
    this.repository.saveLedgerEntry(debitEntry);
    this.repository.saveJournal(journal);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendRecovered, proposalId, actorId, {
      proposalId: proposalId as string,
      distributionId: distributionId as string,
      investorId: investorId as string,
      amount: distribution.amount.amount.toString(),
      currency: distribution.amount.currency,
      reason,
    });

    return recovery;
  }

  getProposal(id: EntityId): DividendProposal | undefined {
    return this.repository.getDividendProposal(id);
  }

  listProposalsByPeriod(period: string): DividendProposal[] {
    return this.repository.listDividendProposalsByPeriod(period);
  }

  listProposalsByStatus(status: DividendStatus): DividendProposal[] {
    return this.repository.listDividendProposalsByStatus(status);
  }

  listEligibilityByDividend(dividendId: EntityId): DividendEligibilityEntry[] {
    return this.repository.listEligibilityByDividend(dividendId);
  }

  listDistributionsByDividend(dividendId: EntityId): DividendDistributionEntry[] {
    return this.repository.listDistributionsByDividend(dividendId);
  }

  listDistributionsByInvestor(investorId: EntityId): DividendDistributionEntry[] {
    return this.repository.listDistributionsByInvestor(investorId);
  }
}
