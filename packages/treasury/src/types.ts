import type { EntityId, Money, Currency, Timestamp } from "@relcko/types";

export enum TreasuryAccountType {
  Operating = "operating",
  Dividend = "dividend",
  Commission = "commission",
  Governance = "governance",
  EmergencyReserve = "emergency_reserve",
  InsuranceReserve = "insurance_reserve",
  PlatformReserve = "platform_reserve",
  BuybackReserve = "buyback_reserve",
  Revenue = "revenue",
  Expense = "expense",
  Asset = "asset",
  Liability = "liability",
  Equity = "equity",
}

export enum TreasuryEntryType {
  Debit = "debit",
  Credit = "credit",
}

export enum JournalStatus {
  Draft = "draft",
  Posted = "posted",
  Reversed = "reversed",
}

export enum AllocationType {
  Revenue = "revenue",
  Reserve = "reserve",
  Dividend = "dividend",
  Commission = "commission",
  Governance = "governance",
  Buyback = "buyback",
  Operating = "operating",
}

export enum DividendStatus {
  Pending = "pending",
  Approved = "approved",
  Distributed = "distributed",
  Failed = "failed",
  Recovered = "recovered",
}

export enum BuybackType {
  Scheduled = "scheduled",
  Governance = "governance",
  Emergency = "emergency",
  Market = "market",
}

export enum BuybackStatus {
  Pending = "pending",
  Approved = "approved",
  Executing = "executing",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum BurnType {
  Manual = "manual",
  Scheduled = "scheduled",
  Governance = "governance",
}

export enum BurnStatus {
  Pending = "pending",
  Approved = "approved",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum TreasuryHealthStatus {
  Healthy = "healthy",
  Warning = "warning",
  Critical = "critical",
}

export interface TreasuryAccount {
  readonly id: EntityId;
  readonly accountType: TreasuryAccountType;
  readonly name: string;
  readonly description: string;
  readonly currency: Currency;
  readonly balance: bigint;
  readonly reservedBalance: bigint;
  readonly availableBalance: bigint;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface LedgerEntry {
  readonly id: EntityId;
  readonly journalId: EntityId;
  readonly accountId: EntityId;
  readonly entryType: TreasuryEntryType;
  readonly amount: bigint;
  readonly currency: Currency;
  readonly balanceBefore: bigint;
  readonly balanceAfter: bigint;
  readonly description: string;
  readonly reference: string;
  readonly referenceId: EntityId;
  readonly createdAt: Timestamp;
}

export interface JournalEntry {
  readonly id: EntityId;
  readonly description: string;
  readonly status: JournalStatus;
  readonly entries: readonly LedgerEntry[];
  readonly debitTotal: bigint;
  readonly creditTotal: bigint;
  readonly balanced: boolean;
  readonly reference: string;
  readonly referenceId: EntityId;
  readonly postedAt?: Timestamp;
  readonly reversedById?: EntityId;
  readonly createdAt: Timestamp;
}

export interface AllocationRule {
  readonly id: EntityId;
  readonly sourceType: AllocationType;
  readonly destinationAccountId: EntityId;
  readonly percentage: number;
  readonly priority: number;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface TreasuryAllocation {
  readonly id: EntityId;
  readonly sourceAmount: Money;
  readonly rules: readonly AllocationExecution[];
  readonly period: string;
  readonly allocatedAt: Timestamp;
}

export interface AllocationExecution {
  readonly ruleId: EntityId;
  readonly accountId: EntityId;
  readonly amount: bigint;
  readonly percentage: number;
}

export interface ReserveConfig {
  readonly id: EntityId;
  readonly accountId: EntityId;
  readonly targetAmount: bigint;
  readonly currentAmount: bigint;
  readonly minThreshold: bigint;
  readonly maxThreshold: bigint;
  readonly replenishRate: number;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface MovementRequest {
  readonly id: EntityId;
  readonly fromAccountId: EntityId;
  readonly toAccountId: EntityId;
  readonly amount: Money;
  readonly reason: string;
  readonly approvedBy?: EntityId;
  readonly status: MovementStatus;
  readonly journalId?: EntityId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export enum MovementStatus {
  Pending = "pending",
  Approved = "approved",
  Completed = "completed",
  Rejected = "rejected",
}

export interface ReconciliationRecord {
  readonly id: EntityId;
  readonly accountId: EntityId;
  readonly expectedBalance: bigint;
  readonly actualBalance: bigint;
  readonly difference: bigint;
  readonly reconciled: boolean;
  readonly period: string;
  readonly reconciledAt?: Timestamp;
  readonly notes?: string;
  readonly createdAt: Timestamp;
}

export interface TreasuryReport {
  readonly id: EntityId;
  readonly reportType: TreasuryReportType;
  readonly period: string;
  readonly generatedAt: Timestamp;
  readonly data: Record<string, unknown>;
}

export enum TreasuryReportType {
  IncomeStatement = "income_statement",
  BalanceSheet = "balance_sheet",
  CashFlow = "cash_flow",
  Treasury = "treasury",
  Reserve = "reserve",
  Dividend = "dividend",
  Commission = "commission",
  Audit = "audit",
}

export interface DividendProposal {
  readonly id: EntityId;
  readonly period: string;
  readonly totalAmount: Money;
  readonly perUnitAmount: Money;
  readonly eligibleUnits: bigint;
  readonly totalDistributed: Money;
  readonly status: DividendStatus;
  readonly approvedAt?: Timestamp;
  readonly distributedAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export interface DividendEligibilityEntry {
  readonly id: EntityId;
  readonly dividendId: EntityId;
  readonly investorId: EntityId;
  readonly units: bigint;
  readonly amount: Money;
  readonly qualified: boolean;
  readonly reason?: string;
  readonly createdAt: Timestamp;
}

export interface DividendDistributionEntry {
  readonly id: EntityId;
  readonly dividendId: EntityId;
  readonly investorId: EntityId;
  readonly amount: Money;
  readonly status: DividendStatus;
  readonly distributedAt?: Timestamp;
  readonly txHash?: string;
  readonly error?: string;
  readonly createdAt: Timestamp;
}

export interface DividendRecoveryEntry {
  readonly id: EntityId;
  readonly dividendId: EntityId;
  readonly distributionId: EntityId;
  readonly investorId: EntityId;
  readonly amount: Money;
  readonly reason: string;
  readonly recoveredAt: Timestamp;
}

export interface BuybackRequest {
  readonly id: EntityId;
  readonly type: BuybackType;
  readonly amount: Money;
  readonly maxPrice?: Money;
  readonly reason: string;
  readonly status: BuybackStatus;
  readonly executedAmount?: Money;
  readonly approvedBy?: EntityId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface BurnRequest {
  readonly id: EntityId;
  readonly type: BurnType;
  readonly amount: bigint;
  readonly reason: string;
  readonly status: BurnStatus;
  readonly executedAt?: Timestamp;
  readonly txHash?: string;
  readonly approvedBy?: EntityId;
  readonly createdAt: Timestamp;
}

export interface CashflowProjection {
  readonly id: EntityId;
  readonly period: string;
  readonly inflows: readonly CashflowLine[];
  readonly outflows: readonly CashflowLine[];
  readonly netCashflow: bigint;
  readonly openingBalance: bigint;
  readonly closingBalance: bigint;
  readonly createdAt: Timestamp;
}

export interface CashflowLine {
  readonly category: string;
  readonly amount: bigint;
  readonly description: string;
}

export interface FinancialStatement {
  readonly id: EntityId;
  readonly statementType: TreasuryReportType;
  readonly period: string;
  readonly lines: readonly StatementLine[];
  readonly totalAssets: bigint;
  readonly totalLiabilities: bigint;
  readonly totalEquity: bigint;
  readonly netIncome: bigint;
  readonly generatedAt: Timestamp;
}

export interface StatementLine {
  readonly accountId: EntityId;
  readonly accountName: string;
  readonly amount: bigint;
  readonly category: string;
}

export interface TreasuryAnalyticsEntry {
  readonly id: EntityId;
  readonly period: string;
  readonly totalAssets: bigint;
  readonly totalLiabilities: bigint;
  readonly totalEquity: bigint;
  readonly revenue: bigint;
  readonly expenses: bigint;
  readonly netIncome: bigint;
  readonly dividendsDistributed: bigint;
  readonly buybacksExecuted: bigint;
  readonly burnExecuted: bigint;
  readonly reserveRatio: number;
  readonly liquidityRatio: number;
  readonly solvencyRatio: number;
  readonly computedAt: Timestamp;
}

export interface TreasuryHealthResult {
  readonly status: TreasuryHealthStatus;
  readonly score: number;
  readonly liquidityScore: number;
  readonly solvencyScore: number;
  readonly reserveScore: number;
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
  readonly computedAt: Timestamp;
}
