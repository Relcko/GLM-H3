import { DomainError } from "@relcko/error";
import type { Address, EntityId, Money, TxHash } from "@relcko/types";
import { asAddress, asTxHash } from "@relcko/types";
import { generateId, money } from "@relcko/utils";
import { assertTransition, transition } from "./state-machine";

export enum InvestorStatus {
  Registered = "registered",
  KycPending = "kyc_pending",
  Active = "active",
  Suspended = "suspended",
  Banned = "banned",
}

const INVESTOR_TRANSITIONS: Readonly<Record<InvestorStatus, readonly InvestorStatus[]>> = {
  [InvestorStatus.Registered]: [InvestorStatus.KycPending, InvestorStatus.Suspended],
  [InvestorStatus.KycPending]: [InvestorStatus.Active, InvestorStatus.Suspended, InvestorStatus.Banned],
  [InvestorStatus.Active]: [InvestorStatus.Suspended, InvestorStatus.Banned],
  [InvestorStatus.Suspended]: [InvestorStatus.Active, InvestorStatus.Banned],
  [InvestorStatus.Banned]: [],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Investor {
  readonly id: EntityId;
  readonly name: string;
  readonly email: string;
  readonly walletAddress?: Address;
  readonly status: InvestorStatus;
  readonly isAdmin: boolean;
  readonly kycStatus: KycStatus;
  readonly createdAt: string;
}

export function assertInvestorInvariants(i: Investor): void {
  if (!EMAIL_RE.test(i.email)) throw new DomainError("Invalid email", "INVESTOR_EMAIL", { id: i.id });
  if (i.status === InvestorStatus.Active && i.kycStatus !== KycStatus.Approved)
    throw new DomainError("active investor requires approved KYC", "INVESTOR_KYC", { id: i.id });
  if (
    i.status === InvestorStatus.Suspended ||
    i.status === InvestorStatus.Banned
  )
    throw new DomainError("suspended/banned investor cannot start investments", "INVESTOR_BLOCKED", {
      id: i.id,
    });
}

export function createInvestor(input: {
  name: string;
  email: string;
  walletAddress?: string;
  isAdmin?: boolean;
}): Investor {
  const investor: Investor = {
    id: generateId("inv"),
    name: input.name,
    email: input.email,
    walletAddress: input.walletAddress ? asAddress(input.walletAddress) : undefined,
    status: InvestorStatus.Registered,
    isAdmin: input.isAdmin ?? false,
    kycStatus: KycStatus.Submitted,
    createdAt: new Date().toISOString(),
  };
  assertInvestorInvariants(investor);
  return investor;
}

export function transitionInvestor(i: Investor, next: InvestorStatus): Investor {
  const status = transition(INVESTOR_TRANSITIONS, i.status, next, "Investor");
  return { ...i, status };
}

export enum AgentStatus {
  Pending = "pending",
  Active = "active",
  Suspended = "suspended",
  Terminated = "terminated",
}

const AGENT_TRANSITIONS: Readonly<Record<AgentStatus, readonly AgentStatus[]>> = {
  [AgentStatus.Pending]: [AgentStatus.Active, AgentStatus.Terminated],
  [AgentStatus.Active]: [AgentStatus.Suspended, AgentStatus.Terminated],
  [AgentStatus.Suspended]: [AgentStatus.Active, AgentStatus.Terminated],
  [AgentStatus.Terminated]: [],
};

export interface Agent {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly code: string;
  readonly status: AgentStatus;
  readonly commissionRate: number;
  readonly totalEarnings: Money;
  readonly withdrawnEarnings: Money;
  readonly createdAt: string;
}

export function assertAgentInvariants(a: Agent): void {
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(a.code))
    throw new DomainError("agent code invalid", "AGENT_CODE", { id: a.id });
  if (a.commissionRate < 0 || a.commissionRate > 100)
    throw new DomainError("commissionRate must be in [0,100]", "AGENT_RATE", { id: a.id });
  if (a.withdrawnEarnings.amount > a.totalEarnings.amount)
    throw new DomainError("withdrawn exceeds total earnings", "AGENT_WITHDRAWN", { id: a.id });
}

export function createAgent(input: {
  userId: EntityId;
  code: string;
  commissionRate: number;
  currency: import("@relcko/types").Currency;
}): Agent {
  const agent: Agent = {
    id: generateId("agent"),
    userId: input.userId,
    code: input.code,
    status: AgentStatus.Pending,
    commissionRate: input.commissionRate,
    totalEarnings: money(0, input.currency),
    withdrawnEarnings: money(0, input.currency),
    createdAt: new Date().toISOString(),
  };
  assertAgentInvariants(agent);
  return agent;
}

export function transitionAgent(a: Agent, next: AgentStatus): Agent {
  const status = transition(AGENT_TRANSITIONS, a.status, next, "Agent");
  return { ...a, status };
}

export enum WalletStatus {
  Linked = "linked",
  Verified = "verified",
  Unverified = "unverified",
}

export interface Wallet {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly address: Address;
  readonly chainId: number;
  readonly verified: boolean;
  readonly linkedAt: string;
}

export function createWallet(input: {
  investorId: EntityId;
  address: string;
  chainId: number;
  verified?: boolean;
}): Wallet {
  if (!input.address.startsWith("0x")) throw new DomainError("invalid wallet address", "WALLET_ADDRESS", input);
  return {
    id: generateId("wallet"),
    investorId: input.investorId,
    address: asAddress(input.address),
    chainId: input.chainId,
    verified: input.verified ?? false,
    linkedAt: new Date().toISOString(),
  };
}

export enum KycStatus {
  Submitted = "submitted",
  Pending = "pending",
  InReview = "in_review",
  Approved = "approved",
  Rejected = "rejected",
}

const KYC_TRANSITIONS: Readonly<Record<KycStatus, readonly KycStatus[]>> = {
  [KycStatus.Submitted]: [KycStatus.Pending, KycStatus.InReview, KycStatus.Rejected],
  [KycStatus.Pending]: [KycStatus.InReview, KycStatus.Rejected],
  [KycStatus.InReview]: [KycStatus.Approved, KycStatus.Rejected],
  [KycStatus.Approved]: [KycStatus.Submitted],
  [KycStatus.Rejected]: [KycStatus.Submitted],
};

export interface KYC {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly documentRefs: readonly string[];
  readonly status: KycStatus;
  readonly submittedAt?: string;
  readonly reviewedAt?: string;
  readonly verifierId?: EntityId;
}

export function assertKycInvariants(k: KYC): void {
  if ((k.status === KycStatus.Submitted || k.status === KycStatus.Pending || k.status === KycStatus.InReview) && k.documentRefs.length === 0)
    throw new DomainError("documents required before KYC submission", "KYC_DOCS", { id: k.id });
  if (k.status === KycStatus.Approved && k.verifierId === k.investorId)
    throw new DomainError("reviewer cannot be the subject", "KYC_SELF_REVIEW", { id: k.id });
}

export function createKyc(input: { investorId: EntityId; documentRefs: readonly string[] }): KYC {
  const kyc: KYC = {
    id: generateId("kyc"),
    investorId: input.investorId,
    documentRefs: input.documentRefs,
    status: KycStatus.Submitted,
    submittedAt: new Date().toISOString(),
  };
  assertKycInvariants(kyc);
  return kyc;
}

export function transitionKyc(k: KYC, next: KycStatus): KYC {
  const status = transition(KYC_TRANSITIONS, k.status, next, "KYC");
  return {
    ...k,
    status,
    reviewedAt: next === KycStatus.Approved || next === KycStatus.Rejected ? new Date().toISOString() : k.reviewedAt,
  };
}

export enum ReferralStatus {
  Pending = "pending",
  Active = "active",
  Expired = "expired",
}

export interface Referral {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly referredUserId: EntityId;
  readonly code: string;
  readonly status: ReferralStatus;
  readonly createdAt: string;
}

export function createReferral(input: {
  agentId: EntityId;
  referredUserId: EntityId;
  code: string;
}): Referral {
  return {
    id: generateId("ref"),
    agentId: input.agentId,
    referredUserId: input.referredUserId,
    code: input.code,
    status: ReferralStatus.Pending,
    createdAt: new Date().toISOString(),
  };
}

export enum CommissionStatus {
  Pending = "pending",
  Approved = "approved",
  Paid = "paid",
  Cancelled = "cancelled",
}

export type CommissionableType = "investment" | "marketplace_sale";

export interface Commission {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly referralId: EntityId;
  readonly userId: EntityId;
  readonly commissionableType: CommissionableType;
  readonly commissionableId: EntityId;
  readonly transactionType: "primary_purchase" | "secondary_buy" | "secondary_sell";
  readonly amount: Money;
  readonly rate: number;
  readonly status: CommissionStatus;
  readonly createdAt: string;
}

export function computeCommission(baseAmount: Money, rate: number): Money {
  if (rate < 0 || rate > 100) throw new DomainError("rate out of bounds", "COMMISSION_RATE", { rate });
  // rate is a percentage (0-100): commission = base * rate / 100.
  return { amount: (baseAmount.amount * BigInt(Math.round(rate * 1e6))) / 100_000_000n, currency: baseAmount.currency };
}

export function createCommission(input: {
  agentId: EntityId;
  referralId: EntityId;
  userId: EntityId;
  commissionableType: CommissionableType;
  commissionableId: EntityId;
  transactionType: Commission["transactionType"];
  baseAmount: Money;
  rate: number;
}): Commission {
  return {
    id: generateId("comm"),
    agentId: input.agentId,
    referralId: input.referralId,
    userId: input.userId,
    commissionableType: input.commissionableType,
    commissionableId: input.commissionableId,
    transactionType: input.transactionType,
    amount: computeCommission(input.baseAmount, input.rate),
    rate: input.rate,
    status: CommissionStatus.Pending,
    createdAt: new Date().toISOString(),
  };
}
