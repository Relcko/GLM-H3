import type { ITreasuryAdapter } from "../infrastructure/adapters/treasury-adapter.interface";
import type { IClock } from "../infrastructure/services/clock";
import type { IUuidProvider } from "../infrastructure/services/uuid-provider";
import { InsufficientReservedFundsError } from "../domain/errors";
import {
  ReservationCreatedEvent,
  ReservationConsumedEvent,
  ReservationReleasedEvent,
  ReservationExpiredEvent,
} from "./security-events";

export type ReservationStatus = "active" | "consumed" | "released" | "expired";

export interface ReservationRecord {
  readonly id: string;
  readonly distributionId: string;
  readonly accountId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly journalId: string;
  readonly status: ReservationStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly consumedAt: number | null;
  readonly releasedAt: number | null;
}

export interface ReserveCommand {
  readonly distributionId: string;
  readonly accountId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly journalId: string;
  readonly ttlMs: number;
}

export interface VerificationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

export interface TreasuryReservationDeps {
  readonly treasuryAdapter: ITreasuryAdapter;
  readonly clock: IClock;
  readonly uuid: IUuidProvider;
}

export const DEFAULT_RESERVATION_TTL_MS = 86_400_000;

export class TreasuryReservationService {
  private _reservations = new Map<string, ReservationRecord>();
  private _distributionReservations = new Map<string, string>();
  private _eventVersion = 0;
  private _uncommittedEvents: ReturnType<typeof this._buildEvent>[] = [];

  constructor(private readonly deps: TreasuryReservationDeps) {}

  get uncommittedEvents(): readonly ReturnType<typeof this._buildEvent>[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents.length = 0;
  }

  async reserve(command: ReserveCommand): Promise<ReservationRecord> {
    const now = this.deps.clock.nowMs();
    const balance = await this.deps.treasuryAdapter.getBalance(command.accountId, command.currency);
    if (balance < command.amount) {
      throw new InsufficientReservedFundsError(command.accountId, balance, command.amount);
    }

    await this.deps.treasuryAdapter.reserveFunds({
      accountId: command.accountId,
      amount: command.amount,
      currency: command.currency,
      journalId: command.journalId,
      reference: `reserve:${command.distributionId}`,
    });

    const id = this.deps.uuid.generate();
    const record: ReservationRecord = {
      id,
      distributionId: command.distributionId,
      accountId: command.accountId,
      amount: command.amount,
      currency: command.currency,
      journalId: command.journalId,
      status: "active",
      createdAt: now,
      expiresAt: now + command.ttlMs,
      consumedAt: null,
      releasedAt: null,
    };

    this._reservations.set(id, record);
    this._distributionReservations.set(command.distributionId, id);

    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ReservationCreatedEvent(`reservation:${id}`, this._eventVersion, {
        reservationId: id,
        distributionId: command.distributionId,
        accountId: command.accountId,
        amount: command.amount,
        currency: command.currency,
        journalId: command.journalId,
        expiresAt: record.expiresAt,
        createdAt: now,
      }),
    );

    return record;
  }

  async verifyReservation(distributionId: string, expectedAmount: bigint, expectedCurrency: string): Promise<VerificationResult> {
    const reservationId = this._distributionReservations.get(distributionId);
    if (!reservationId) {
      return { valid: false, reason: `No reservation found for distribution ${distributionId}` };
    }

    const reservation = this._reservations.get(reservationId);
    if (!reservation) {
      return { valid: false, reason: `Reservation ${reservationId} not found` };
    }

    if (reservation.status === "consumed") {
      return { valid: false, reason: `Reservation ${reservationId} already consumed` };
    }

    if (reservation.status === "released") {
      return { valid: false, reason: `Reservation ${reservationId} already released` };
    }

    if (reservation.status === "expired") {
      return { valid: false, reason: `Reservation ${reservationId} already expired` };
    }

    const now = this.deps.clock.nowMs();
    if (now >= reservation.expiresAt) {
      reservation.status = "expired";
      this._eventVersion += 1;
      this._uncommittedEvents.push(
        new ReservationExpiredEvent(`reservation:${reservationId}`, this._eventVersion, {
          reservationId,
          distributionId,
          amount: reservation.amount,
          expiredAt: now,
        }),
      );
      return { valid: false, reason: `Reservation ${reservationId} expired at ${new Date(reservation.expiresAt).toISOString()}` };
    }

    if (reservation.amount !== expectedAmount) {
      return {
        valid: false,
        reason: `Reservation amount mismatch: expected ${expectedAmount}, got ${reservation.amount}`,
      };
    }

    if (reservation.currency !== expectedCurrency) {
      return {
        valid: false,
        reason: `Reservation currency mismatch: expected ${expectedCurrency}, got ${reservation.currency}`,
      };
    }

    return { valid: true, reason: null };
  }

  async releaseReservation(distributionId: string, reason: string): Promise<void> {
    const reservationId = this._distributionReservations.get(distributionId);
    if (!reservationId) return;

    const reservation = this._reservations.get(reservationId);
    if (!reservation) return;

    if (reservation.status === "released" || reservation.status === "consumed") return;

    await this.deps.treasuryAdapter.releaseFunds({
      accountId: reservation.accountId,
      amount: reservation.amount,
      currency: reservation.currency,
      journalId: reservation.journalId,
      reference: `release:${distributionId}:${reason}`,
    });

    reservation.status = "released";
    reservation.releasedAt = this.deps.clock.nowMs();

    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ReservationReleasedEvent(`reservation:${reservationId}`, this._eventVersion, {
        reservationId,
        distributionId,
        amount: reservation.amount,
        releasedAt: reservation.releasedAt,
        reason,
      }),
    );
  }

  async consumeReservation(distributionId: string): Promise<void> {
    const reservationId = this._distributionReservations.get(distributionId);
    if (!reservationId) throw new Error(`No reservation to consume for distribution ${distributionId}`);

    const reservation = this._reservations.get(reservationId);
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);

    if (reservation.status !== "active") {
      throw new Error(`Reservation ${reservationId} cannot be consumed: status is ${reservation.status}`);
    }

    const now = this.deps.clock.nowMs();
    reservation.status = "consumed";
    reservation.consumedAt = now;

    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ReservationConsumedEvent(`reservation:${reservationId}`, this._eventVersion, {
        reservationId,
        distributionId,
        amount: reservation.amount,
        consumedAt: now,
      }),
    );
  }

  expireStaleReservations(): number {
    const now = this.deps.clock.nowMs();
    let expiredCount = 0;

    for (const [id, reservation] of this._reservations) {
      if (reservation.status === "active" && now >= reservation.expiresAt) {
        reservation.status = "expired";
        expiredCount += 1;
        this._eventVersion += 1;
        this._uncommittedEvents.push(
          new ReservationExpiredEvent(`reservation:${id}`, this._eventVersion, {
            reservationId: id,
            distributionId: reservation.distributionId,
            amount: reservation.amount,
            expiredAt: now,
          }),
        );
      }
    }

    return expiredCount;
  }

  getReservation(distributionId: string): ReservationRecord | null {
    const reservationId = this._distributionReservations.get(distributionId);
    if (!reservationId) return null;
    return this._reservations.get(reservationId) ?? null;
  }

  getAllReservations(): ReservationRecord[] {
    return Array.from(this._reservations.values());
  }

  clear(): void {
    this._reservations.clear();
    this._distributionReservations.clear();
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }
}
