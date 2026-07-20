import type { Address, Currency, EntityId, Money, TxHash } from "@relcko/types";

export enum InvestmentTxStatus {
  Pending = "pending",
  Submitted = "submitted",
  Confirmed = "confirmed",
  Failed = "failed",
  Cancelled = "cancelled",
  Expired = "expired",
  Recovered = "recovered",
}

export enum PaymentMethod {
  NativeToken = "native_token",
  ERC20 = "erc20",
}

export enum InvestmentAction {
  Purchase = "purchase",
  Transfer = "transfer",
  Withdraw = "withdraw",
}

export interface InvestmentRequest {
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly fractionId: EntityId;
  readonly tokens: bigint;
  readonly amount: bigint;
  readonly currency: Currency;
  readonly paymentMethod: PaymentMethod;
  readonly tokenAddress?: Address;
  readonly chainId: number;
  readonly walletAddress: Address;
  readonly idempotencyKey: string;
}

export interface Reservation {
  readonly id: EntityId;
  readonly investmentId: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly tokens: bigint;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly chainId: number;
  readonly walletAddress: Address;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface TransactionRecord {
  readonly id: EntityId;
  readonly investmentId: EntityId;
  readonly reservationId: EntityId;
  readonly investorId: EntityId;
  readonly chainId: number;
  readonly txHash?: TxHash;
  readonly from: Address;
  readonly to: Address;
  readonly amount: bigint;
  readonly currency: Currency;
  readonly method: PaymentMethod;
  readonly tokenAddress?: Address;
  readonly status: InvestmentTxStatus;
  readonly confirmations: number;
  readonly requiredConfirmations: number;
  readonly blockNumber?: number;
  readonly gasUsed?: bigint;
  readonly gasPrice?: bigint;
  readonly error?: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly submittedAt: string;
  readonly confirmedAt?: string;
  readonly createdAt: string;
}

export interface SettlementRecord {
  readonly id: EntityId;
  readonly investmentId: EntityId;
  readonly transactionId: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly tokens: bigint;
  readonly amount: Money;
  readonly status: SettlementStatus;
  readonly completedAt?: string;
  readonly createdAt: string;
}

export enum SettlementStatus {
  Pending = "pending",
  Settling = "settling",
  Completed = "completed",
  Failed = "failed",
}

export interface RecoveryRecord {
  readonly id: EntityId;
  readonly transactionId: EntityId;
  readonly reason: string;
  readonly status: RecoveryStatus;
  readonly newTxHash?: TxHash;
  readonly attempts: number;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export enum RecoveryStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Resolved = "resolved",
  Failed = "failed",
}

export interface OwnershipSnapshot {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly quantity: bigint;
  readonly avgCostBasis: Money;
  readonly ownershipPercentage: number;
  readonly snapshotAt: string;
}

export interface PortfolioHoldingEntry {
  readonly propertyId: EntityId;
  readonly propertyName: string;
  readonly quantity: bigint;
  readonly value: Money;
  readonly costBasis: Money;
  readonly profitLoss: Money;
  readonly ownershipPercentage: number;
}

export interface PortfolioSnapshot {
  readonly investorId: EntityId;
  readonly totalInvested: Money;
  readonly totalValue: Money;
  readonly totalProfitLoss: Money;
  readonly holdings: readonly PortfolioHoldingEntry[];
  readonly computedAt: string;
}

export interface ChainConfig {
  readonly chainId: number;
  readonly chainName: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly nativeCurrency: { name: string; symbol: string; decimals: number };
  readonly requiredConfirmations: number;
  readonly confirmationTimeoutMs: number;
}

export interface TokenConfig {
  readonly address: Address;
  readonly symbol: string;
  readonly decimals: number;
  readonly chainId: number;
}

export interface BlockchainConfig {
  readonly chains: readonly ChainConfig[];
  readonly tokens: readonly TokenConfig[];
  readonly defaultChainId: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
}

export interface TransactionReceipt {
  readonly txHash: TxHash;
  readonly blockNumber: number;
  readonly confirmations: number;
  readonly gasUsed: bigint;
  readonly gasPrice: bigint;
  readonly status: "success" | "reverted";
  readonly logs: readonly unknown[];
}

export interface EligibilityCheck {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export interface LedgerEntry {
  readonly id: EntityId;
  readonly investmentId: EntityId;
  readonly investorId: EntityId;
  readonly amount: Money;
  readonly currency: Currency;
  readonly type: LedgerEntryType;
  readonly txHash?: TxHash;
  readonly recordedAt: string;
}

export enum LedgerEntryType {
  Investment = "investment",
  Settlement = "settlement",
  Refund = "refund",
  Recovery = "recovery",
}

export interface InvestmentHistoryEntry {
  readonly id: EntityId;
  readonly investmentId: EntityId;
  readonly investorId: EntityId;
  readonly propertyId: EntityId;
  readonly eventType: string;
  readonly actorId: EntityId;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: string;
}
