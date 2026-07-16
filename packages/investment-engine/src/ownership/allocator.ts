import {
  createOwnership,
  computeAvgCostBasis,
  OwnershipStatus,
  type Investment,
  type Ownership,
} from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { generateId, decimalsFor, money } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { OwnershipSnapshot } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { OwnershipError } from "../errors";

export class OwnershipAllocator {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async allocate(actorId: EntityId, investment: Investment): Promise<Ownership> {
    const existing = this.repository.getOwnership(investment.investorId, investment.propertyId);

    let ownership: Ownership;

    if (existing) {
      const avgCostBasis = computeAvgCostBasis(
        existing.avgCostBasis,
        existing.quantity,
        investment.amount,
        investment.tokens,
      );

      const newQty = existing.quantity + investment.tokens;

      ownership = {
        ...existing,
        quantity: newQty,
        avgCostBasis,
        status: OwnershipStatus.Increased,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const decimals = decimalsFor(investment.amount.currency);
      const factor = 10n ** BigInt(decimals);
      const majorPart = investment.amount.amount / factor;
      const minorPart = investment.amount.amount % factor;
      const costBasisValue = Number(majorPart) + Number(minorPart) / Number(factor);
      const tokenPriceValue = investment.tokens > 0n
        ? (Number(investment.amount.amount / investment.tokens) + Number(investment.amount.amount % investment.tokens) / Number(investment.tokens)) / Number(factor)
        : 0;

      ownership = createOwnership({
        investorId: investment.investorId,
        propertyId: investment.propertyId,
        fractionId: investment.fractionId,
        quantity: investment.tokens,
        avgCostBasis: costBasisValue,
        currentPrice: tokenPriceValue,
        currency: investment.amount.currency,
        totalSupply: investment.tokens * 100n,
      });
    }

    this.repository.saveOwnership(ownership);

    const snapshot: OwnershipSnapshot = {
      id: generateId("osnap"),
      investorId: investment.investorId,
      propertyId: investment.propertyId,
      quantity: ownership.quantity,
      avgCostBasis: ownership.avgCostBasis,
      ownershipPercentage: ownership.ownershipPercentage,
      snapshotAt: new Date().toISOString(),
    };

    this.repository.saveOwnershipSnapshot(snapshot);

    await publishInvestmentEvent(this.events, InvestmentEventType.OwnershipAllocated, investment.id, actorId, {
      ownershipId: ownership.id,
      investorId: ownership.investorId,
      propertyId: ownership.propertyId,
      quantity: ownership.quantity.toString(),
      status: ownership.status,
    });

    await publishInvestmentEvent(this.events, InvestmentEventType.OwnershipSnapshotGenerated, investment.id, actorId, {
      snapshotId: snapshot.id,
      investorId: snapshot.investorId,
      propertyId: snapshot.propertyId,
      quantity: snapshot.quantity.toString(),
      snapshotAt: snapshot.snapshotAt,
    });

    this.logger?.info("ownership allocated", {
      ownershipId: ownership.id,
      investorId: investment.investorId,
      propertyId: investment.propertyId,
      quantity: investment.tokens.toString(),
    });

    return ownership;
  }

  getOwnership(investorId: EntityId, propertyId: EntityId): Ownership | undefined {
    return this.repository.getOwnership(investorId, propertyId);
  }

  listOwnerships(investorId: EntityId): Ownership[] {
    return this.repository.listOwnershipsByInvestor(investorId);
  }
}
