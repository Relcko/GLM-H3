import { ErrorCategory, RelckoError } from "@relcko/error";

export class TreasuryError extends RelckoError {
  constructor(message: string, code = "TREASURY_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class AccountNotFoundError extends TreasuryError {
  constructor(id: string) {
    super(`Account ${id} not found`, "ACCOUNT_NOT_FOUND", { id });
  }
}

export class JournalNotFoundError extends TreasuryError {
  constructor(id: string) {
    super(`Journal ${id} not found`, "JOURNAL_NOT_FOUND", { id });
  }
}

export class UnbalancedJournalError extends TreasuryError {
  constructor(debit: string, credit: string) {
    super(`Journal unbalanced: debits ${debit} != credits ${credit}`, "UNBALANCED_JOURNAL", { debit, credit });
  }
}

export class InsufficientBalanceError extends TreasuryError {
  constructor(accountId: string, available: string, required: string) {
    super(`Insufficient balance in ${accountId}: ${available} < ${required}`, "INSUFFICIENT_BALANCE", { accountId, available, required });
  }
}

export class AllocationError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ALLOCATION_ERROR", metadata);
  }
}

export class ReserveError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RESERVE_ERROR", metadata);
  }
}

export class MovementError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "MOVEMENT_ERROR", metadata);
  }
}

export class MultiSigError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "MULTISIG_ERROR", metadata);
  }
}

export class YieldError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "YIELD_ERROR", metadata);
  }
}

export class ReconciliationError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RECONCILIATION_ERROR", metadata);
  }
}

export class DividendError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "DIVIDEND_ERROR", metadata);
  }
}

export class BuybackError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "BUYBACK_ERROR", metadata);
  }
}

export class BurnError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "BURN_ERROR", metadata);
  }
}

export class CashflowError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CASHFLOW_ERROR", metadata);
  }
}

export class ReportingError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "REPORTING_ERROR", metadata);
  }
}

export class AnalyticsError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ANALYTICS_ERROR", metadata);
  }
}

export class HealthError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "HEALTH_ERROR", metadata);
  }
}

export class ConcurrencyError extends TreasuryError {
  constructor(id: string, expected: number, actual: number) {
    super(`Concurrency conflict on ${id}: expected version ${expected}, actual ${actual}`, "CONCURRENCY_CONFLICT", { id, expected, actual });
  }
}

export class ClaimNotFoundError extends TreasuryError {
  constructor(id: string) {
    super(`Claim ${id} not found`, "CLAIM_NOT_FOUND", { id });
  }
}

export class DividendClaimError extends TreasuryError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "DIVIDEND_CLAIM_ERROR", metadata);
  }
}
