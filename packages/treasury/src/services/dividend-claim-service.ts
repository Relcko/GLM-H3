import { generateId } from "@relcko/utils";
import type { EntityId, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { TreasuryRepository } from "../repository";
import type { DividendClaim, ClaimReceipt } from "../types";
import { ClaimStatus } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { DividendClaimError, ClaimNotFoundError } from "../errors";

const validTransitions: Record<ClaimStatus, readonly ClaimStatus[]> = {
  [ClaimStatus.Initiated]: [ClaimStatus.Claimed, ClaimStatus.Expired, ClaimStatus.Disputed],
  [ClaimStatus.Claimed]: [ClaimStatus.Paid, ClaimStatus.Expired, ClaimStatus.Disputed],
  [ClaimStatus.Paid]: [ClaimStatus.Completed, ClaimStatus.Expired, ClaimStatus.Disputed, ClaimStatus.Reversed],
  [ClaimStatus.Completed]: [ClaimStatus.Reversed],
  [ClaimStatus.Expired]: [],
  [ClaimStatus.Disputed]: [ClaimStatus.Reversed],
  [ClaimStatus.Reversed]: [],
};

function assertTransition(from: ClaimStatus, to: ClaimStatus): void {
  const allowed = validTransitions[from];
  if (!allowed.includes(to)) {
    throw new DividendClaimError(
      `Cannot transition claim from ${from} to ${to}`,
      { from, to },
    );
  }
}

export default class DividendClaimService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
  ) {}

  async initiateClaim(
    actorId: EntityId,
    params: {
      readonly scheduleId: EntityId;
      readonly investorId: EntityId;
      readonly quantity: bigint;
      readonly amount: bigint;
      readonly currency: string;
      readonly expiresAt?: Timestamp;
    },
  ): Promise<DividendClaim> {
    const id = generateId("treasury") as EntityId;
    const now = Date.now() as Timestamp;

    const claim: DividendClaim = {
      id,
      scheduleId: params.scheduleId,
      investorId: params.investorId,
      quantity: params.quantity,
      amount: { amount: params.amount, currency: params.currency },
      status: ClaimStatus.Initiated,
      version: 0,
      initiatedAt: now,
      expiresAt: params.expiresAt,
      createdAt: now,
    };

    this.repository.saveClaim(claim);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimInitiated, id, actorId, {
      claimId: id as string,
      scheduleId: params.scheduleId as string,
      investorId: params.investorId as string,
      quantity: String(params.quantity),
      amount: String(params.amount),
      currency: params.currency,
    });

    return claim;
  }

  async submitClaim(
    actorId: EntityId,
    claimId: EntityId,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Claimed);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Claimed,
      claimedAt: now,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    const receipt: ClaimReceipt = {
      id: generateId("treasury") as EntityId,
      claimId: claim.id,
      investorId: claim.investorId,
      scheduleId: claim.scheduleId,
      amount: claim.amount,
      acknowledgedAt: now,
    };

    this.repository.saveClaimReceipt(receipt);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimed, claimId, actorId, {
      claimId: claimId as string,
      investorId: claim.investorId as string,
    });

    return this.repository.getClaim(claimId)!;
  }

  async payClaim(
    actorId: EntityId,
    claimId: EntityId,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Paid);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Paid,
      paidAt: now,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimPaid, claimId, actorId, {
      claimId: claimId as string,
      amount: String(claim.amount.amount),
      currency: claim.amount.currency,
    });

    return this.repository.getClaim(claimId)!;
  }

  async completeClaim(
    actorId: EntityId,
    claimId: EntityId,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Completed);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Completed,
      completedAt: now,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimCompleted, claimId, actorId, {
      claimId: claimId as string,
    });

    return this.repository.getClaim(claimId)!;
  }

  async expireClaim(
    actorId: EntityId,
    claimId: EntityId,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Expired);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Expired,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimExpired, claimId, actorId, {
      claimId: claimId as string,
    });

    return this.repository.getClaim(claimId)!;
  }

  async disputeClaim(
    actorId: EntityId,
    claimId: EntityId,
    reason?: string,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Disputed);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Disputed,
      disputedAt: now,
      reference: reason ?? claim.reference,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimDisputed, claimId, actorId, {
      claimId: claimId as string,
      reason: reason ?? "",
    });

    return this.repository.getClaim(claimId)!;
  }

  async reverseClaim(
    actorId: EntityId,
    claimId: EntityId,
    reason?: string,
  ): Promise<DividendClaim> {
    const claim = this.repository.getClaim(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId as string);

    assertTransition(claim.status, ClaimStatus.Reversed);

    const now = Date.now() as Timestamp;

    const updated: DividendClaim = {
      ...claim,
      status: ClaimStatus.Reversed,
      reversedAt: now,
      reference: reason ?? claim.reference,
      updatedAt: now,
    };

    this.repository.saveClaim(updated, claim.version);

    await publishTreasuryEvent(this.events, TreasuryEventType.DividendClaimReversed, claimId, actorId, {
      claimId: claimId as string,
      reason: reason ?? "",
    });

    return this.repository.getClaim(claimId)!;
  }

  getClaim(id: EntityId): DividendClaim | undefined {
    return this.repository.getClaim(id);
  }

  listClaimsBySchedule(scheduleId: EntityId): DividendClaim[] {
    return this.repository.listClaimsBySchedule(scheduleId);
  }

  listClaimsByInvestor(investorId: EntityId): DividendClaim[] {
    return this.repository.listClaimsByInvestor(investorId);
  }

  listClaimsByStatus(status: ClaimStatus): DividendClaim[] {
    return this.repository.listClaimsByStatus(status);
  }

  getClaimReceipt(id: EntityId): ClaimReceipt | undefined {
    return this.repository.getClaimReceipt(id);
  }

  listClaimReceiptsByInvestor(investorId: EntityId): ClaimReceipt[] {
    return this.repository.listClaimReceiptsByInvestor(investorId);
  }
}
