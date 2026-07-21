import type { EntityId } from "@relcko/types";
import type { TreasuryRepository } from "./repository";
import type {
  TreasuryAccount, LedgerEntry, JournalEntry, AllocationRule, TreasuryAllocation,
  ReserveConfig, MovementRequest, ReconciliationRecord, TreasuryReport,
  DividendProposal, DividendEligibilityEntry, DividendDistributionEntry, DividendRecoveryEntry,
  DividendSchedule, OwnershipSnapshot, SnapshotPosition,
  BuybackRequest, BurnRequest, CashflowProjection, FinancialStatement, TreasuryAnalyticsEntry,
  TreasuryHealthResult, TreasuryAccountType, MovementStatus, DividendStatus,
  ScheduleStatus, BuybackStatus, BurnStatus, TreasuryReportType,
  MultiSigConfig, MultiSigSignature,
  YieldRecord,
} from "./types";

export class InMemoryTreasuryRepository implements TreasuryRepository {
  private readonly accounts = new Map<EntityId, TreasuryAccount>();
  private readonly ledger: LedgerEntry[] = [];
  private readonly journals = new Map<EntityId, JournalEntry>();
  private readonly allocationRules: AllocationRule[] = [];
  private readonly allocations: TreasuryAllocation[] = [];
  private readonly reserveConfigs = new Map<EntityId, ReserveConfig>();
  private readonly movements = new Map<EntityId, MovementRequest>();
  private readonly reconciliations: ReconciliationRecord[] = [];
  private readonly reports: TreasuryReport[] = [];
  private readonly dividendProposals = new Map<EntityId, DividendProposal>();
  private readonly eligibility: DividendEligibilityEntry[] = [];
  private readonly distributions: DividendDistributionEntry[] = [];
  private readonly recoveries: DividendRecoveryEntry[] = [];
  private readonly schedules = new Map<EntityId, DividendSchedule>();
  private readonly snapshots = new Map<EntityId, OwnershipSnapshot>();
  private readonly snapshotPositions = new Map<EntityId, SnapshotPosition[]>();
  private readonly buybacks = new Map<EntityId, BuybackRequest>();
  private readonly burns = new Map<EntityId, BurnRequest>();
  private readonly cashflows = new Map<string, CashflowProjection>();
  private readonly statements: FinancialStatement[] = [];
  private readonly analytics = new Map<string, TreasuryAnalyticsEntry>();
  private healthResult?: TreasuryHealthResult;
  private readonly processedEvents = new Set<string>();

  saveAccount(a: TreasuryAccount): void { this.accounts.set(a.id, a); }
  getAccount(id: EntityId): TreasuryAccount | undefined { return this.accounts.get(id); }
  listAccountsByType(type: TreasuryAccountType): TreasuryAccount[] {
    return Array.from(this.accounts.values()).filter(a => a.accountType === type);
  }
  listAllAccounts(): TreasuryAccount[] { return Array.from(this.accounts.values()); }

  saveLedgerEntry(e: LedgerEntry): void { this.ledger.push(e); }
  listLedgerByAccount(accountId: EntityId): LedgerEntry[] {
    return this.ledger.filter(e => e.accountId === accountId);
  }
  listLedgerByJournal(journalId: EntityId): LedgerEntry[] {
    return this.ledger.filter(e => e.journalId === journalId);
  }
  listLedgerByPeriod(accountId: EntityId, period: string): LedgerEntry[] {
    return this.ledger.filter(e => e.accountId === accountId && e.createdAt.includes(period));
  }

  saveJournal(j: JournalEntry): void { this.journals.set(j.id, j); }
  getJournal(id: EntityId): JournalEntry | undefined { return this.journals.get(id); }
  listJournalsByStatus(status: string): JournalEntry[] {
    return Array.from(this.journals.values()).filter(j => j.status === status);
  }

  saveAllocationRule(r: AllocationRule): void {
    const idx = this.allocationRules.findIndex(existing => existing.id === r.id);
    if (idx >= 0) {
      this.allocationRules[idx] = r;
    } else {
      this.allocationRules.push(r);
    }
  }
  listAllocationRules(): AllocationRule[] { return [...this.allocationRules]; }
  listActiveAllocationRules(): AllocationRule[] { return this.allocationRules.filter(r => r.active); }

  saveAllocation(a: TreasuryAllocation): void { this.allocations.push(a); }
  listAllocationsByPeriod(period: string): TreasuryAllocation[] {
    return this.allocations.filter(a => a.period === period);
  }

  saveReserveConfig(c: ReserveConfig): void { this.reserveConfigs.set(c.accountId, c); }
  getReserveConfig(accountId: EntityId): ReserveConfig | undefined { return this.reserveConfigs.get(accountId); }
  listReserveConfigs(): ReserveConfig[] { return Array.from(this.reserveConfigs.values()); }

  saveMovement(m: MovementRequest): void { this.movements.set(m.id, m); }
  getMovement(id: EntityId): MovementRequest | undefined { return this.movements.get(id); }
  listMovementsByStatus(status: MovementStatus): MovementRequest[] {
    return Array.from(this.movements.values()).filter(m => m.status === status);
  }

  saveReconciliation(r: ReconciliationRecord): void {
    const idx = this.reconciliations.findIndex(existing => existing.id === r.id);
    if (idx >= 0) {
      this.reconciliations[idx] = r;
    } else {
      this.reconciliations.push(r);
    }
  }
  listReconciliationsByAccount(accountId: EntityId): ReconciliationRecord[] {
    return this.reconciliations.filter(r => r.accountId === accountId);
  }
  listReconciliationsByPeriod(period: string): ReconciliationRecord[] {
    return this.reconciliations.filter(r => r.period === period);
  }

  saveReport(r: TreasuryReport): void { this.reports.push(r); }
  listReportsByType(type: TreasuryReportType): TreasuryReport[] { return this.reports.filter(r => r.reportType === type); }
  listReportsByPeriod(period: string): TreasuryReport[] { return this.reports.filter(r => r.period === period); }

  saveDividendProposal(d: DividendProposal): void { this.dividendProposals.set(d.id, d); }
  getDividendProposal(id: EntityId): DividendProposal | undefined { return this.dividendProposals.get(id); }
  listDividendProposalsByPeriod(period: string): DividendProposal[] {
    return Array.from(this.dividendProposals.values()).filter(d => d.period === period);
  }
  listDividendProposalsByStatus(status: DividendStatus): DividendProposal[] {
    return Array.from(this.dividendProposals.values()).filter(d => d.status === status);
  }

  saveDividendEligibility(e: DividendEligibilityEntry): void { this.eligibility.push(e); }
  listEligibilityByDividend(dividendId: EntityId): DividendEligibilityEntry[] {
    return this.eligibility.filter(e => e.dividendId === dividendId);
  }

  saveDividendDistribution(d: DividendDistributionEntry): void { this.distributions.push(d); }
  listDistributionsByDividend(dividendId: EntityId): DividendDistributionEntry[] {
    return this.distributions.filter(d => d.dividendId === dividendId);
  }
  listDistributionsByInvestor(investorId: EntityId): DividendDistributionEntry[] {
    return this.distributions.filter(d => d.investorId === investorId);
  }

  saveDividendRecovery(r: DividendRecoveryEntry): void { this.recoveries.push(r); }
  listRecoveriesByDividend(dividendId: EntityId): DividendRecoveryEntry[] {
    return this.recoveries.filter(r => r.dividendId === dividendId);
  }

  saveSchedule(d: DividendSchedule): void { this.schedules.set(d.id, d); }
  getSchedule(id: EntityId): DividendSchedule | undefined { return this.schedules.get(id); }
  listSchedulesByProperty(propertyId: EntityId): DividendSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.propertyId === propertyId);
  }
  listSchedulesByStatus(status: ScheduleStatus): DividendSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.status === status);
  }
  listAllSchedules(): DividendSchedule[] {
    return Array.from(this.schedules.values());
  }

  saveSnapshot(s: OwnershipSnapshot): void { this.snapshots.set(s.id, s); }
  getSnapshot(id: EntityId): OwnershipSnapshot | undefined { return this.snapshots.get(id); }
  getSnapshotBySchedule(scheduleId: EntityId): OwnershipSnapshot | undefined {
    return Array.from(this.snapshots.values()).find(s => s.scheduleId === scheduleId);
  }

  saveSnapshotPositions(snapshotId: EntityId, positions: readonly SnapshotPosition[]): void {
    this.snapshotPositions.set(snapshotId, [...positions]);
  }
  listSnapshotPositions(snapshotId: EntityId): SnapshotPosition[] {
    return this.snapshotPositions.get(snapshotId) ?? [];
  }

  saveBuybackRequest(b: BuybackRequest): void { this.buybacks.set(b.id, b); }
  getBuybackRequest(id: EntityId): BuybackRequest | undefined { return this.buybacks.get(id); }
  listBuybacksByStatus(status: BuybackStatus): BuybackRequest[] {
    return Array.from(this.buybacks.values()).filter(b => b.status === status);
  }

  saveBurnRequest(b: BurnRequest): void { this.burns.set(b.id, b); }
  getBurnRequest(id: EntityId): BurnRequest | undefined { return this.burns.get(id); }
  listBurnsByStatus(status: BurnStatus): BurnRequest[] {
    return Array.from(this.burns.values()).filter(b => b.status === status);
  }

  saveCashflowProjection(c: CashflowProjection): void { this.cashflows.set(c.period, c); }
  getCashflowProjection(period: string): CashflowProjection | undefined { return this.cashflows.get(period); }

  saveFinancialStatement(s: FinancialStatement): void { this.statements.push(s); }
  listStatementsByPeriod(period: string): FinancialStatement[] { return this.statements.filter(s => s.period === period); }

  saveAnalytics(a: TreasuryAnalyticsEntry): void { this.analytics.set(a.period, a); }
  getLatestAnalytics(): TreasuryAnalyticsEntry | undefined {
    const entries = Array.from(this.analytics.values());
    return entries.length > 0 ? entries[entries.length - 1] : undefined;
  }
  listAnalyticsByPeriod(period: string): TreasuryAnalyticsEntry[] {
    return Array.from(this.analytics.values()).filter(a => a.period === period);
  }

  saveHealthResult(h: TreasuryHealthResult): void { this.healthResult = h; }
  getLatestHealthResult(): TreasuryHealthResult | undefined { return this.healthResult; }

  isEventProcessed(eventId: string): boolean { return this.processedEvents.has(eventId); }
  markEventProcessed(eventId: string): void { this.processedEvents.add(eventId); }
}
