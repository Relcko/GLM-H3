import { ErrorCategory, RelckoError } from "@relcko/error";

export class InvestmentEngineError extends RelckoError {
  constructor(message: string, code = "INVESTMENT_ENGINE_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class InvestmentNotFoundError extends InvestmentEngineError {
  constructor(id: string) {
    super(`Investment ${id} not found`, "INVESTMENT_NOT_FOUND", { id });
  }
}

export class ReservationNotFoundError extends InvestmentEngineError {
  constructor(id: string) {
    super(`Reservation ${id} not found`, "RESERVATION_NOT_FOUND", { id });
  }
}

export class TransactionNotFoundError extends InvestmentEngineError {
  constructor(id: string) {
    super(`Transaction ${id} not found`, "TRANSACTION_NOT_FOUND", { id });
  }
}

export class EligibilityError extends InvestmentEngineError {
  readonly reasons: readonly string[];
  constructor(message: string, reasons: readonly string[], metadata?: RelckoError["metadata"]) {
    super(message, "ELIGIBILITY_FAILED", { ...metadata, reasons });
    this.reasons = reasons;
  }
}

export class ReservationExpiredError extends InvestmentEngineError {
  constructor(reservationId: string) {
    super(`Reservation ${reservationId} has expired`, "RESERVATION_EXPIRED", { reservationId });
  }
}

export class ReservationConflictError extends InvestmentEngineError {
  constructor(investorId: string, propertyId: string) {
    super(`Active reservation exists for investor ${investorId} on property ${propertyId}`, "RESERVATION_CONFLICT", { investorId, propertyId });
  }
}

export class TransactionFailedError extends InvestmentEngineError {
  constructor(txHash: string, reason: string) {
    super(`Transaction ${txHash} failed: ${reason}`, "TRANSACTION_FAILED", { txHash, reason });
  }
}

export class TransactionExpiredError extends InvestmentEngineError {
  constructor(txHash: string) {
    super(`Transaction ${txHash} expired`, "TRANSACTION_EXPIRED", { txHash });
  }
}

export class ConfirmationTimeoutError extends InvestmentEngineError {
  constructor(txHash: string, confirmations: number) {
    super(`Transaction ${txHash} confirmation timeout at ${confirmations} confirmations`, "CONFIRMATION_TIMEOUT", { txHash, confirmations });
  }
}

export class SettlementFailedError extends InvestmentEngineError {
  constructor(investmentId: string, reason: string) {
    super(`Settlement failed for investment ${investmentId}: ${reason}`, "SETTLEMENT_FAILED", { investmentId, reason });
  }
}

export class OwnershipError extends InvestmentEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "OWNERSHIP_ERROR", metadata);
  }
}

export class LedgerError extends InvestmentEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "LEDGER_ERROR", metadata);
  }
}

export class BlockchainError extends InvestmentEngineError {
  constructor(message: string, code = "BLOCKCHAIN_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class ChainNotSupportedError extends BlockchainError {
  constructor(chainId: number) {
    super(`Chain ${chainId} is not supported`, "CHAIN_NOT_SUPPORTED", { chainId });
  }
}

export class RpcError extends BlockchainError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RPC_ERROR", metadata);
  }
}

export class ReorgDetectedError extends BlockchainError {
  constructor(txHash: string, expectedBlock: number, actualBlock: number) {
    super(`Reorg detected for tx ${txHash}: expected block ${expectedBlock}, actual ${actualBlock}`, "REORG_DETECTED", { txHash, expectedBlock, actualBlock });
  }
}

export class DoubleSubmitError extends InvestmentEngineError {
  constructor(idempotencyKey: string) {
    super(`Double submit detected for key ${idempotencyKey}`, "DOUBLE_SUBMIT", { idempotencyKey });
  }
}

export class ReplayError extends InvestmentEngineError {
  constructor(eventId: string) {
    super(`Replay detected for event ${eventId}`, "REPLAY_DETECTED", { eventId });
  }
}

export class SignatureVerificationError extends InvestmentEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "SIGNATURE_VERIFICATION_FAILED", metadata);
  }
}

export class ChainVerificationError extends InvestmentEngineError {
  constructor(expected: number, actual: number) {
    super(`Chain mismatch: expected ${expected}, actual ${actual}`, "CHAIN_MISMATCH", { expected, actual });
  }
}

export class PortfolioError extends InvestmentEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "PORTFOLIO_ERROR", metadata);
  }
}

export class RecoveryError extends InvestmentEngineError {
  constructor(transactionId: string, reason: string) {
    super(`Recovery failed for transaction ${transactionId}: ${reason}`, "RECOVERY_FAILED", { transactionId, reason });
  }
}
