export { InvestmentOrchestrator, type InvestmentOrchestratorDeps } from "./orchestrator";

export { EligibilityEngine } from "./eligibility/engine";
export { ReservationEngine } from "./reservation/engine";
export { TransactionEngine } from "./transaction/engine";
export { TransactionMonitor } from "./transaction/monitor";
export { SettlementOrchestrator } from "./settlement/orchestrator";
export { SettlementWorker, type SettlementWorkerConfig } from "./settlement/worker";
export { OwnershipAllocator } from "./ownership/allocator";
export { LedgerAdapter, type TreasuryLedger, type LedgerAdapterDeps } from "./ledger/adapter";
export { RecoveryEngine } from "./recovery/engine";
export { InvestmentHistoryService } from "./history/service";
export { PortfolioAdapter } from "./portfolio/adapter";
export { SecurityGuard } from "./security/guard";
export { ViemBlockchainAdapter } from "./blockchain/adapter";
export type { BlockchainAdapter } from "./blockchain/adapter";
export {
  getChainConfig,
  isChainSupported,
  getTokenConfig,
  getExplorerTxUrl,
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  DEFAULT_BLOCKCHAIN_CONFIG,
} from "./blockchain/chains";

export {
  InMemoryInvestmentEngineRepository,
  createInMemoryInvestmentEngineRepository,
} from "./in-memory-repository";
export type { InvestmentEngineRepository } from "./repository";

export {
  InvestmentEngineError,
  InvestmentNotFoundError,
  ReservationNotFoundError,
  TransactionNotFoundError,
  EligibilityError,
  ReservationExpiredError,
  ReservationConflictError,
  TransactionFailedError,
  TransactionExpiredError,
  ConfirmationTimeoutError,
  SettlementFailedError,
  SettlementInProgressError,
  OwnershipError,
  LedgerError,
  BlockchainError,
  ChainNotSupportedError,
  RpcError,
  ReorgDetectedError,
  DoubleSubmitError,
  ReplayError,
  SignatureVerificationError,
  ChainVerificationError,
  PortfolioError,
  RecoveryError,
} from "./errors";

export { InvestmentEventType, publishInvestmentEvent } from "./events";

export {
  InvestmentTxStatus,
  PaymentMethod,
  SettlementStatus,
  RecoveryStatus,
  LedgerEntryType,
} from "./types";

export type {
  InvestmentRequest,
  Reservation,
  TransactionRecord,
  SettlementRecord,
  RecoveryRecord,
  OwnershipSnapshot,
  PortfolioSnapshot,
  PortfolioHoldingEntry,
  InvestmentHistoryEntry,
  ChainConfig,
  TokenConfig,
  BlockchainConfig,
  TransactionReceipt,
  EligibilityCheck,
  LedgerEntry,
} from "./types";
