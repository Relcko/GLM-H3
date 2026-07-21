import type { EntityId } from "@relcko/types";
import type {
  TreasuryAccount, LedgerEntry, JournalEntry, AllocationRule, TreasuryAllocation,
  ReserveConfig, MovementRequest, ReconciliationRecord, TreasuryReport,
  DividendProposal, DividendEligibilityEntry, DividendDistributionEntry, DividendRecoveryEntry,
  DividendSchedule, OwnershipSnapshot, SnapshotPosition,
  BuybackRequest, BurnRequest, CashflowProjection, FinancialStatement, TreasuryAnalyticsEntry,
  TreasuryHealthResult, TreasuryAccountType, MovementStatus, DividendStatus,
  ScheduleStatus, BuybackStatus, BurnStatus, TreasuryReportType,
  MultiSigConfig, MultiSigSignature,
  YieldRecord, DividendClaim, ClaimReceipt, ClaimStatus,
} from "./types";

export interface TreasuryRepository {
  saveAccount(a: TreasuryAccount): void;
  getAccount(id: EntityId): TreasuryAccount | undefined;
  listAccountsByType(type: TreasuryAccountType): TreasuryAccount[];
  listAllAccounts(): TreasuryAccount[];

  saveLedgerEntry(e: LedgerEntry): void;
  listLedgerByAccount(accountId: EntityId): LedgerEntry[];
  listLedgerByJournal(journalId: EntityId): LedgerEntry[];
  listLedgerByPeriod(accountId: EntityId, period: string): LedgerEntry[];

  saveJournal(j: JournalEntry): void;
  getJournal(id: EntityId): JournalEntry | undefined;
  listJournalsByStatus(status: string): JournalEntry[];

  saveAllocationRule(r: AllocationRule): void;
  listAllocationRules(): AllocationRule[];
  listActiveAllocationRules(): AllocationRule[];

  saveAllocation(a: TreasuryAllocation): void;
  listAllocationsByPeriod(period: string): TreasuryAllocation[];

  saveReserveConfig(c: ReserveConfig): void;
  getReserveConfig(accountId: EntityId): ReserveConfig | undefined;
  listReserveConfigs(): ReserveConfig[];

  saveMovement(m: MovementRequest): void;
  getMovement(id: EntityId): MovementRequest | undefined;
  listMovementsByStatus(status: MovementStatus): MovementRequest[];

  saveMultiSigConfig(c: MultiSigConfig): void;
  getMultiSigConfig(accountId: EntityId): MultiSigConfig | undefined;
  saveSignature(s: MultiSigSignature): void;
  getSignaturesByMovement(movementId: EntityId): MultiSigSignature[];
  hasSignerSigned(movementId: EntityId, signerId: EntityId): boolean;

  saveReconciliation(r: ReconciliationRecord): void;
  listReconciliationsByAccount(accountId: EntityId): ReconciliationRecord[];
  listReconciliationsByPeriod(period: string): ReconciliationRecord[];

  saveReport(r: TreasuryReport): void;
  listReportsByType(type: TreasuryReportType): TreasuryReport[];
  listReportsByPeriod(period: string): TreasuryReport[];

  saveDividendProposal(d: DividendProposal): void;
  getDividendProposal(id: EntityId): DividendProposal | undefined;
  listDividendProposalsByPeriod(period: string): DividendProposal[];
  listDividendProposalsByStatus(status: DividendStatus): DividendProposal[];

  saveDividendEligibility(e: DividendEligibilityEntry): void;
  listEligibilityByDividend(dividendId: EntityId): DividendEligibilityEntry[];

  saveDividendDistribution(d: DividendDistributionEntry): void;
  listDistributionsByDividend(dividendId: EntityId): DividendDistributionEntry[];
  listDistributionsByInvestor(investorId: EntityId): DividendDistributionEntry[];

  saveDividendRecovery(r: DividendRecoveryEntry): void;
  listRecoveriesByDividend(dividendId: EntityId): DividendRecoveryEntry[];

  saveSchedule(d: DividendSchedule): void;
  getSchedule(id: EntityId): DividendSchedule | undefined;
  listSchedulesByProperty(propertyId: EntityId): DividendSchedule[];
  listSchedulesByStatus(status: ScheduleStatus): DividendSchedule[];
  listAllSchedules(): DividendSchedule[];

  saveSnapshot(s: OwnershipSnapshot): void;
  getSnapshot(id: EntityId): OwnershipSnapshot | undefined;
  getSnapshotBySchedule(scheduleId: EntityId): OwnershipSnapshot | undefined;

  saveSnapshotPositions(snapshotId: EntityId, positions: readonly SnapshotPosition[]): void;
  listSnapshotPositions(snapshotId: EntityId): SnapshotPosition[];

  saveBuybackRequest(b: BuybackRequest): void;
  getBuybackRequest(id: EntityId): BuybackRequest | undefined;
  listBuybacksByStatus(status: BuybackStatus): BuybackRequest[];

  saveBurnRequest(b: BurnRequest): void;
  getBurnRequest(id: EntityId): BurnRequest | undefined;
  listBurnsByStatus(status: BurnStatus): BurnRequest[];

  saveCashflowProjection(c: CashflowProjection): void;
  getCashflowProjection(period: string): CashflowProjection | undefined;

  saveFinancialStatement(s: FinancialStatement): void;
  listStatementsByPeriod(period: string): FinancialStatement[];

  saveAnalytics(a: TreasuryAnalyticsEntry): void;
  getLatestAnalytics(): TreasuryAnalyticsEntry | undefined;
  listAnalyticsByPeriod(period: string): TreasuryAnalyticsEntry[];

  saveHealthResult(h: TreasuryHealthResult): void;
  getLatestHealthResult(): TreasuryHealthResult | undefined;

  saveYieldRecord(r: YieldRecord): void;
  getYieldRecord(id: EntityId): YieldRecord | undefined;
  listYieldRecords(accountId: EntityId): YieldRecord[];
  listYieldRecordsByAccount(accountId: EntityId): YieldRecord[];
  isYieldReferenceProcessed(reference: string): boolean;
  markYieldReference(reference: string): void;

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;

  saveClaim(claim: DividendClaim, expectedVersion?: number): void;
  getClaim(id: EntityId): DividendClaim | undefined;
  listClaimsBySchedule(scheduleId: EntityId): DividendClaim[];
  listClaimsByInvestor(investorId: EntityId): DividendClaim[];
  listClaimsByStatus(status: ClaimStatus): DividendClaim[];

  saveClaimReceipt(receipt: ClaimReceipt): void;
  getClaimReceipt(id: EntityId): ClaimReceipt | undefined;
  listClaimReceiptsByInvestor(investorId: EntityId): ClaimReceipt[];
}
