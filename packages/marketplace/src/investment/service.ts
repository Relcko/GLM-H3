import {
  applyInvestmentToSupply,
  computeAvgCostBasis,
  createInvestment,
  createOwnership,
  InvestmentStatus,
  OwnershipStatus,
  type Investment,
  type Ownership,
  type Property,
} from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { decimalsFor, money } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { Action } from "@relcko/permission";
import { MarketplaceAuthorization, type Principal, subjectId, toSubject, isAccount } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateReserveInvestment } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { EligibilityError, InvestmentNotFoundError, PropertyNotFoundError } from "../errors";
import { InvestmentStateMachine } from "./state-machine";
import { PropertyEligibilityEngine } from "../property/eligibility";

/**
 * Investment service. Handles the primary-market investment workflow, applying
 * the frozen investment lifecycle and the DOMAIN_MODEL.md rules: supply is
 * decremented and ownership created on settlement (confirmed), KYC is required,
 * and every step emits a canonical event for the ledger / audit subscribers.
 */
export class InvestmentService {
  private readonly stateMachine = new InvestmentStateMachine();
  private readonly eligibility = new PropertyEligibilityEngine();

  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  /** Reservation: create an investment at Pending (no supply change yet). */
  async reserve(principal: Principal, input: unknown): Promise<Investment> {
    this.auth.assert(principal, Action.Invest, { ownerId: subjectId(principal) });

    if (isAccount(principal) && (principal.status === "suspended" || principal.status === "closed")) {
      throw new EligibilityError(
        `Investor account is ${principal.status}`,
        ["investor_account_blocked"],
        { principalId: principal.id, status: principal.status },
      );
    }

    const v = validateReserveInvestment(input);
    const property = this.requireProperty(v.propertyId);
    const fractionId = v.fractionId ?? property.id;
    const amount = money(v.amount, v.currency);
    const result = this.eligibility.check(property, { tokens: v.tokens, amount });
    if (!result.eligible) {
      throw new EligibilityError("Investment is not eligible", result.reasons, { propertyId: v.propertyId });
    }
    const investment = createInvestment({
      investorId: subjectId(principal) as EntityId,
      propertyId: v.propertyId,
      fractionId,
      tokens: v.tokens,
      amount: v.amount,
      currency: v.currency,
      txHash: v.txHash,
      kycVerified: toSubject(principal).kycApproved ?? false,
    });
    this.repository.saveInvestment(investment);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.InvestmentReserved, investment.id, subjectId(principal) as EntityId, {
      propertyId: investment.propertyId,
      tokens: investment.tokens.toString(),
      amount: investment.amount.amount.toString(),
    });
    this.logger?.info("investment reserved", { investmentId: investment.id, propertyId: investment.propertyId });
    return investment;
  }

  /** Confirmation: Pending → Processing. */
  async confirm(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    const updated = this.stateMachine.transition(inv, InvestmentStatus.Processing);
    this.repository.saveInvestment(updated);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentConfirmed);
    return updated;
  }

  /** Funding in progress (no state change; operational signal). */
  async markFunded(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    if (inv.status !== InvestmentStatus.Processing) {
      throw new EligibilityError("Only processing investments can be funded", ["investment not in processing state"]);
    }
    await this.emit(principal, inv, MarketplaceEventType.InvestmentFunded);
    return inv;
  }

  /** Settlement & completion: Processing → Confirmed; applies supply + ownership. */
  async settle(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    const updated = this.stateMachine.transition(inv, InvestmentStatus.Confirmed);
    const property = this.requireProperty(inv.propertyId);
    const updatedProperty = applyInvestmentToSupply(property, inv.tokens);
    this.repository.saveProperty(updatedProperty);
    this.repository.saveOwnership(this.applyOwnership(inv, updatedProperty));
    this.repository.saveInvestment(updated);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentSettled);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentCompleted);
    return updated;
  }

  /** Cancellation: Pending → Failed. */
  async cancel(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    const updated = this.stateMachine.transition(inv, InvestmentStatus.Failed);
    this.repository.saveInvestment(updated);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentCancelled);
    return updated;
  }

  /** Failure: → Failed. */
  async fail(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    const updated = this.stateMachine.transition(inv, InvestmentStatus.Failed);
    this.repository.saveInvestment(updated);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentFailed);
    return updated;
  }

  /** Refund: Failed → Refunded. */
  async refund(principal: Principal, id: string): Promise<Investment> {
    const inv = this.require(id);
    this.auth.assert(principal, Action.Invest, { ownerId: inv.investorId });
    const updated = this.stateMachine.transition(inv, InvestmentStatus.Refunded);
    this.repository.saveInvestment(updated);
    await this.emit(principal, updated, MarketplaceEventType.InvestmentRefunded);
    return updated;
  }

  get(id: string): Investment {
    return this.require(id);
  }

  listByProperty(propertyId: string): Investment[] {
    return this.repository.listInvestmentsByProperty(propertyId as EntityId);
  }

  listByInvestor(investorId: string): Investment[] {
    return this.repository.listInvestmentsByInvestor(investorId as EntityId);
  }

  private applyOwnership(inv: Investment, property: Property): Ownership {
    const existing = this.repository.getOwnership(inv.investorId, inv.propertyId);
    const decimals = decimalsFor(inv.currency);
    const priceMajor = Number(property.tokenPrice.amount) / 10 ** decimals;
    if (existing) {
      const avg = computeAvgCostBasis(existing.avgCostBasis, existing.quantity, inv.amount, inv.tokens);
      const newQty = existing.quantity + inv.tokens;
      const currentValue: Money = { amount: property.tokenPrice.amount * newQty, currency: inv.currency };
      const profitLoss: Money = { amount: currentValue.amount - avg.amount * newQty, currency: inv.currency };
      const ownershipPct = Number((newQty * 10_000n) / property.totalTokens) / 100;
      return {
        ...existing,
        quantity: newQty,
        avgCostBasis: avg,
        currentValue,
        profitLoss,
        ownershipPercentage: ownershipPct,
        status: OwnershipStatus.Increased,
        updatedAt: new Date().toISOString(),
      };
    }
    return createOwnership({
      investorId: inv.investorId,
      propertyId: inv.propertyId,
      fractionId: inv.fractionId,
      quantity: inv.tokens,
      avgCostBasis: priceMajor,
      currentPrice: priceMajor,
      currency: inv.currency,
      totalSupply: property.totalTokens,
    });
  }

  private async emit(principal: Principal, inv: Investment, event: string): Promise<void> {
    await publishMarketplaceEvent(this.events, event, inv.id, subjectId(principal) as EntityId, {
      propertyId: inv.propertyId,
      status: inv.status,
      tokens: inv.tokens.toString(),
    });
  }

  private require(id: string): Investment {
    const inv = this.repository.getInvestment(id as EntityId);
    if (!inv) throw new InvestmentNotFoundError(id);
    return inv;
  }

  private requireProperty(id: string): Property {
    const p = this.repository.getProperty(id as EntityId);
    if (!p) throw new PropertyNotFoundError(id);
    return p;
  }
}
