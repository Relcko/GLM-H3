import { DomainError } from "@relcko/error";
import type { Currency, EntityId, Money, TxHash } from "@relcko/types";
import { asTxHash } from "@relcko/types";
import { generateId, money } from "@relcko/utils";
import { PaymentMethod } from "@relcko/types";
import { transition } from "./state-machine";

export enum TransactionType {
  Purchase = "purchase",
  Sale = "sale",
  Dividend = "dividend",
  Withdrawal = "withdrawal",
  Refund = "refund",
}

export enum TransactionStatus {
  Pending = "pending",
  Confirmed = "confirmed",
  Failed = "failed",
}

export interface Transaction {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly propertyId?: EntityId;
  readonly investmentId?: EntityId;
  readonly saleId?: EntityId;
  readonly type: TransactionType;
  readonly amount: Money;
  readonly currency: Currency;
  readonly txHash?: TxHash;
  readonly status: TransactionStatus;
  readonly timestamp: string;
}

export function createTransaction(input: {
  investorId: EntityId;
  type: TransactionType;
  amount: number;
  currency: Currency;
  propertyId?: EntityId;
  investmentId?: EntityId;
  saleId?: EntityId;
  txHash?: string;
}): Transaction {
  if (input.amount <= 0) throw new DomainError("transaction amount must be > 0", "TX_AMOUNT", input);
  return {
    id: generateId("tx"),
    investorId: input.investorId,
    propertyId: input.propertyId,
    investmentId: input.investmentId,
    saleId: input.saleId,
    type: input.type,
    amount: money(input.amount, input.currency),
    currency: input.currency,
    txHash: input.txHash ? asTxHash(input.txHash) : undefined,
    status: TransactionStatus.Pending,
    timestamp: new Date().toISOString(),
  };
}

export enum PaymentStatus {
  Initiated = "initiated",
  Pending = "pending",
  Settled = "settled",
  Failed = "failed",
  Refunded = "refunded",
}

const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.Initiated]: [PaymentStatus.Pending, PaymentStatus.Failed],
  [PaymentStatus.Pending]: [PaymentStatus.Settled, PaymentStatus.Failed],
  [PaymentStatus.Settled]: [PaymentStatus.Refunded],
  [PaymentStatus.Failed]: [PaymentStatus.Refunded],
  [PaymentStatus.Refunded]: [],
};

export interface Payment {
  readonly id: EntityId;
  readonly payerId: EntityId;
  readonly payeeId: EntityId;
  readonly amount: Money;
  readonly currency: Currency;
  readonly method: PaymentMethod;
  readonly txHash?: TxHash;
  readonly status: PaymentStatus;
  readonly relatedInvestmentId?: EntityId;
  readonly relatedSaleId?: EntityId;
  readonly relatedWithdrawalId?: EntityId;
  readonly createdAt: string;
}

export function createPayment(input: {
  payerId: EntityId;
  payeeId: EntityId;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  txHash?: string;
  relatedInvestmentId?: EntityId;
  relatedSaleId?: EntityId;
  relatedWithdrawalId?: EntityId;
}): Payment {
  if (input.amount <= 0) throw new DomainError("payment amount must be > 0", "PAYMENT_AMOUNT", input);
  return {
    id: generateId("pay"),
    payerId: input.payerId,
    payeeId: input.payeeId,
    amount: money(input.amount, input.currency),
    currency: input.currency,
    method: input.method,
    txHash: input.txHash ? asTxHash(input.txHash) : undefined,
    status: PaymentStatus.Initiated,
    relatedInvestmentId: input.relatedInvestmentId,
    relatedSaleId: input.relatedSaleId,
    relatedWithdrawalId: input.relatedWithdrawalId,
    createdAt: new Date().toISOString(),
  };
}

export function transitionPayment(p: Payment, next: PaymentStatus): Payment {
  const status = transition(PAYMENT_TRANSITIONS, p.status, next, "Payment");
  return { ...p, status };
}

export type AuditAction = string;
export type EntityType =
  | "investment"
  | "marketplace_sale"
  | "ownership"
  | "kyc"
  | "commission"
  | "agent"
  | "payment"
  | "wallet"
  | "property"
  | "spv"
  | "document"
  | "referral";

export interface AuditLog {
  readonly id: EntityId;
  readonly actorId: EntityId;
  readonly action: AuditAction;
  readonly entityType: EntityType;
  readonly entityId: EntityId;
  readonly before?: Record<string, unknown>;
  readonly after?: Record<string, unknown>;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly timestamp: string;
}

/** Append-only (entity 19). No edit/delete paths exist. */
export function createAuditLog(input: {
  actorId: EntityId;
  action: AuditAction;
  entityType: EntityType;
  entityId: EntityId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): AuditLog {
  if (!input.actorId || !input.action || !input.entityId)
    throw new DomainError("actor, action and entityId are mandatory", "AUDIT_REQUIRED", input);
  return {
    id: generateId("audit"),
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    ip: input.ip,
    userAgent: input.userAgent,
    timestamp: new Date().toISOString(),
  };
}

export enum DocumentCategory {
  Legal = "legal",
  Financial = "financial",
  Title = "title",
  Inspection = "inspection",
  Kyc = "kyc",
}

export enum DocumentStatus {
  Uploaded = "uploaded",
  Public = "public",
  Private = "private",
}

export interface Documents {
  readonly id: EntityId;
  readonly propertyId?: EntityId;
  readonly investorId?: EntityId;
  readonly uploaderId: EntityId;
  readonly category: DocumentCategory;
  readonly filename: string;
  readonly url: string;
  readonly size: number;
  readonly isPublic: boolean;
  readonly uploadedAt: string;
}

export function createDocument(input: {
  propertyId?: EntityId;
  investorId?: EntityId;
  uploaderId: EntityId;
  category: DocumentCategory;
  filename: string;
  url: string;
  size: number;
  isPublic?: boolean;
}): Documents {
  if (input.size <= 0) throw new DomainError("document size must be > 0", "DOC_SIZE", input);
  if (!input.isPublic && (input.category === DocumentCategory.Kyc))
    throw new DomainError("KYC documents must be private", "DOC_KYC_PUBLIC", input);
  return {
    id: generateId("doc"),
    propertyId: input.propertyId,
    investorId: input.investorId,
    uploaderId: input.uploaderId,
    category: input.category,
    filename: input.filename,
    url: input.url,
    size: input.size,
    isPublic: input.isPublic ?? false,
    uploadedAt: new Date().toISOString(),
  };
}

export enum RewardStatus {
  Scheduled = "scheduled",
  Processing = "processing",
  Completed = "completed",
  Cancelled = "cancelled",
}

export interface RewardSchedule {
  readonly id: EntityId;
  readonly propertyId: EntityId;
  readonly period: string;
  readonly totalAmount: Money;
  readonly perTokenAmount: Money;
  readonly currency: Currency;
  readonly status: RewardStatus;
  readonly createdAt: string;
}

export function createRewardSchedule(input: {
  propertyId: EntityId;
  period: string;
  totalAmount: number;
  perTokenAmount: number;
  currency: Currency;
}): RewardSchedule {
  if (input.perTokenAmount <= 0) throw new DomainError("perTokenAmount must be > 0", "REWARD_PER_TOKEN", input);
  return {
    id: generateId("rew"),
    propertyId: input.propertyId,
    period: input.period,
    totalAmount: money(input.totalAmount, input.currency),
    perTokenAmount: money(input.perTokenAmount, input.currency),
    currency: input.currency,
    status: RewardStatus.Scheduled,
    createdAt: new Date().toISOString(),
  };
}

export interface RewardPayment {
  readonly id: EntityId;
  readonly rewardId: EntityId;
  readonly investorId: EntityId;
  readonly amount: Money;
  readonly status: "pending" | "paid";
  readonly createdAt: string;
}

export function computeRewardPayout(schedule: RewardSchedule, holdingQuantity: bigint): Money {
  return { amount: schedule.perTokenAmount.amount * holdingQuantity, currency: schedule.currency };
}
