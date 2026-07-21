import { createTreasuryContext } from "@relcko/treasury";
import type { EntityId, Timestamp } from "@relcko/types";
import { FinancialError } from "./errors";
import {
  DividendClaimError,
  ClaimNotFoundError,
  ConcurrencyError,
} from "@relcko/treasury";
import type { ClaimStatus } from "@relcko/treasury";

let context: ReturnType<typeof createTreasuryContext> | undefined;

function getContext(): ReturnType<typeof createTreasuryContext> {
  if (!context) {
    context = createTreasuryContext();
  }
  return context;
}

export interface InitiateClaimInput {
  readonly scheduleId: string;
  readonly investorId: string;
  readonly quantity: string;
  readonly amount: string;
  readonly currency: string;
  readonly expiresAt?: number;
}

export interface ClaimResponse {
  readonly id: string;
  readonly scheduleId: string;
  readonly investorId: string;
  readonly quantity: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly version: number;
  readonly initiatedAt: number;
  readonly claimedAt?: number;
  readonly paidAt?: number;
  readonly completedAt?: number;
  readonly expiresAt?: number;
  readonly disputedAt?: number;
  readonly reversedAt?: number;
  readonly reference?: string;
  readonly createdAt: number;
  readonly updatedAt?: number;
}

export interface ClaimReceiptResponse {
  readonly id: string;
  readonly claimId: string;
  readonly investorId: string;
  readonly scheduleId: string;
  readonly amount: string;
  readonly currency: string;
  readonly acknowledgedAt: number;
}

function toClaimResponse(claim: {
  readonly id: EntityId;
  readonly scheduleId: EntityId;
  readonly investorId: EntityId;
  readonly quantity: bigint;
  readonly amount: { readonly amount: bigint; readonly currency: string };
  readonly status: ClaimStatus;
  readonly version: number;
  readonly initiatedAt: Timestamp;
  readonly claimedAt?: Timestamp;
  readonly paidAt?: Timestamp;
  readonly completedAt?: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly disputedAt?: Timestamp;
  readonly reversedAt?: Timestamp;
  readonly reference?: string;
  readonly createdAt: Timestamp;
  readonly updatedAt?: Timestamp;
}): ClaimResponse {
  return {
    id: claim.id as string,
    scheduleId: claim.scheduleId as string,
    investorId: claim.investorId as string,
    quantity: String(claim.quantity),
    amount: String(claim.amount.amount),
    currency: claim.amount.currency,
    status: claim.status,
    version: claim.version,
    initiatedAt: claim.initiatedAt,
    claimedAt: claim.claimedAt,
    paidAt: claim.paidAt,
    completedAt: claim.completedAt,
    expiresAt: claim.expiresAt,
    disputedAt: claim.disputedAt,
    reversedAt: claim.reversedAt,
    reference: claim.reference,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

function toClaimReceiptResponse(receipt: {
  readonly id: EntityId;
  readonly claimId: EntityId;
  readonly investorId: EntityId;
  readonly scheduleId: EntityId;
  readonly amount: { readonly amount: bigint; readonly currency: string };
  readonly acknowledgedAt: Timestamp;
}): ClaimReceiptResponse {
  return {
    id: receipt.id as string,
    claimId: receipt.claimId as string,
    investorId: receipt.investorId as string,
    scheduleId: receipt.scheduleId as string,
    amount: String(receipt.amount.amount),
    currency: receipt.amount.currency,
    acknowledgedAt: receipt.acknowledgedAt,
  };
}

function translateError(error: unknown): never {
  if (error instanceof ClaimNotFoundError) {
    throw new FinancialError(404, error.code, error.message);
  }
  if (error instanceof DividendClaimError) {
    throw new FinancialError(422, error.code, error.message);
  }
  if (error instanceof ConcurrencyError) {
    throw new FinancialError(409, error.code, error.message);
  }
  throw error;
}

export async function initiateClaimAction(input: InitiateClaimInput, actorId: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.initiateClaim(actorId as EntityId, {
      scheduleId: input.scheduleId as EntityId,
      investorId: input.investorId as EntityId,
      quantity: BigInt(input.quantity),
      amount: BigInt(input.amount),
      currency: input.currency,
      expiresAt: input.expiresAt as Timestamp | undefined,
    });
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function submitClaimAction(claimId: string, actorId: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.submitClaim(actorId as EntityId, claimId as EntityId);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function payClaimAction(claimId: string, actorId: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.payClaim(actorId as EntityId, claimId as EntityId);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function completeClaimAction(claimId: string, actorId: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.completeClaim(actorId as EntityId, claimId as EntityId);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function expireClaimAction(claimId: string, actorId: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.expireClaim(actorId as EntityId, claimId as EntityId);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function disputeClaimAction(claimId: string, actorId: string, reason?: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.disputeClaim(actorId as EntityId, claimId as EntityId, reason);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export async function reverseClaimAction(claimId: string, actorId: string, reason?: string): Promise<ClaimResponse> {
  try {
    const svc = getContext().dividendClaimService;
    const claim = await svc.reverseClaim(actorId as EntityId, claimId as EntityId, reason);
    return toClaimResponse(claim);
  } catch (error) {
    translateError(error);
  }
}

export function getClaimAction(claimId: string): ClaimResponse | undefined {
  const svc = getContext().dividendClaimService;
  const claim = svc.getClaim(claimId as EntityId);
  return claim ? toClaimResponse(claim) : undefined;
}

export function listClaimsByScheduleAction(scheduleId: string): ClaimResponse[] {
  const svc = getContext().dividendClaimService;
  return svc.listClaimsBySchedule(scheduleId as EntityId).map(toClaimResponse);
}

export function listClaimsByInvestorAction(investorId: string): ClaimResponse[] {
  const svc = getContext().dividendClaimService;
  return svc.listClaimsByInvestor(investorId as EntityId).map(toClaimResponse);
}

export function listClaimsByStatusAction(status: string): ClaimResponse[] {
  const svc = getContext().dividendClaimService;
  return svc.listClaimsByStatus(status as ClaimStatus).map(toClaimResponse);
}

export function getClaimReceiptAction(receiptId: string): ClaimReceiptResponse | undefined {
  const svc = getContext().dividendClaimService;
  const receipt = svc.getClaimReceipt(receiptId as EntityId);
  return receipt ? toClaimReceiptResponse(receipt) : undefined;
}

export function listClaimReceiptsByInvestorAction(investorId: string): ClaimReceiptResponse[] {
  const svc = getContext().dividendClaimService;
  return svc.listClaimReceiptsByInvestor(investorId as EntityId).map(toClaimReceiptResponse);
}
