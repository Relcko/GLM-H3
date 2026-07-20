import { createInvestment, type Investment } from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { generateId, money } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { InvestmentRequest, Reservation } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { ReservationConflictError, ReservationExpiredError } from "../errors";
import { PaymentMethod } from "../types";

export const RESERVATION_DURATION_MS = 30 * 60 * 1000;

export class ReservationEngine {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, request: InvestmentRequest): Promise<{ investment: Investment; reservation: Reservation }> {
    const existing = this.repository.getActiveReservation(request.investorId, request.propertyId);
    if (existing) {
      throw new ReservationConflictError(request.investorId, request.propertyId);
    }

    const investment = createInvestment({
      investorId: request.investorId,
      propertyId: request.propertyId,
      fractionId: request.fractionId,
      tokens: request.tokens,
      amount: Number(request.amount),
      currency: request.currency,
      kycVerified: true,
    });

    this.repository.saveInvestment(investment);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MS).toISOString();

    const reservation: Reservation = {
      id: generateId("res"),
      investmentId: investment.id,
      investorId: request.investorId,
      propertyId: request.propertyId,
      tokens: request.tokens,
      amount: { amount: request.amount, currency: request.currency },
      paymentMethod: request.paymentMethod,
      chainId: request.chainId,
      walletAddress: request.walletAddress,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.repository.saveReservation(reservation);

    await publishInvestmentEvent(this.events, InvestmentEventType.InvestmentReserved, investment.id, actorId, {
      propertyId: request.propertyId,
      reservationId: reservation.id,
      tokens: request.tokens.toString(),
      amount: request.amount.toString(),
      expiresAt,
    });

    this.logger?.info("reservation created", {
      reservationId: reservation.id,
      investmentId: investment.id,
      propertyId: request.propertyId,
      expiresAt,
    });

    return { investment, reservation };
  }

  async confirmWallet(actorId: EntityId, reservationId: EntityId): Promise<Reservation> {
    const reservation = this.repository.getReservation(reservationId);
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    if (new Date(reservation.expiresAt) < new Date()) {
      this.repository.deleteReservation(reservationId);
      throw new ReservationExpiredError(reservationId);
    }

    await publishInvestmentEvent(this.events, InvestmentEventType.WalletConfirmed, reservation.investmentId, actorId, {
      reservationId: reservation.id,
      walletAddress: reservation.walletAddress,
    });

    return reservation;
  }

  async cancel(actorId: EntityId, reservationId: EntityId): Promise<void> {
    const reservation = this.repository.getReservation(reservationId);
    if (!reservation) return;

    this.repository.deleteReservation(reservationId);

    await publishInvestmentEvent(this.events, InvestmentEventType.ReservationCancelled, reservation.investmentId, actorId, {
      reservationId: reservation.id,
    });

    this.logger?.info("reservation cancelled", { reservationId: reservation.id });
  }

  isExpired(reservation: Reservation): boolean {
    return new Date(reservation.expiresAt) < new Date();
  }

  getReservation(reservationId: EntityId): Reservation | undefined {
    return this.repository.getReservation(reservationId);
  }

  async expireStaleReservations(actorId: EntityId): Promise<number> {
    let expired = 0;
    const now = new Date();
    const reservations = this.repository.listAllReservations();

    for (const reservation of reservations) {
      if (new Date(reservation.expiresAt) < now) {
        await this.cancel(actorId, reservation.id);
        expired++;
      }
    }

    return expired;
  }
}
