import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { Investment, Ownership, Property } from "@relcko/domain-core";
import type { InvestmentEngineRepository } from "./repository";
import type {
  Reservation,
  TransactionRecord,
  SettlementRecord,
  RecoveryRecord,
  OwnershipSnapshot,
  InvestmentHistoryEntry,
  LedgerEntry,
} from "./types";

export class InMemoryInvestmentEngineRepository implements InvestmentEngineRepository {
  private readonly properties = new Map<EntityId, Property>();
  private readonly investments = new Map<EntityId, Investment>();
  private readonly reservations = new Map<EntityId, Reservation>();
  private readonly transactions = new Map<EntityId, TransactionRecord>();
  private readonly settlements = new Map<EntityId, SettlementRecord>();
  private readonly ownerships = new Map<string, Ownership>();
  private readonly recoveries = new Map<EntityId, RecoveryRecord>();
  private readonly snapshots = new Map<string, OwnershipSnapshot[]>();
  private readonly history = new Map<EntityId, InvestmentHistoryEntry[]>();
  private readonly ledger = new Map<EntityId, LedgerEntry[]>();
  private readonly idempotencyKeys = new Set<string>();
  private readonly processedEvents = new Set<string>();

  private ownershipKey(investorId: EntityId, propertyId: EntityId): string {
    return `${investorId}:${propertyId}`;
  }

  saveProperty(p: Property): void {
    this.properties.set(p.id, p);
  }
  getProperty(id: EntityId): Property | undefined {
    return this.properties.get(id);
  }

  saveInvestment(i: Investment): void {
    this.investments.set(i.id, i);
  }

  getInvestment(id: EntityId): Investment | undefined {
    return this.investments.get(id);
  }

  listInvestmentsByInvestor(investorId: EntityId): Investment[] {
    return [...this.investments.values()].filter(i => i.investorId === investorId);
  }

  listInvestmentsByProperty(propertyId: EntityId): Investment[] {
    return [...this.investments.values()].filter(i => i.propertyId === propertyId);
  }

  saveReservation(r: Reservation): void {
    this.reservations.set(r.id, r);
  }

  getReservation(id: EntityId): Reservation | undefined {
    return this.reservations.get(id);
  }

  getReservationByInvestment(investmentId: EntityId): Reservation | undefined {
    return [...this.reservations.values()].find(r => r.investmentId === investmentId);
  }

  getActiveReservation(investorId: EntityId, propertyId: EntityId): Reservation | undefined {
    return [...this.reservations.values()].find(
      r => r.investorId === investorId && r.propertyId === propertyId,
    );
  }

  deleteReservation(id: EntityId): void {
    this.reservations.delete(id);
  }

  listAllReservations(): Reservation[] {
    return Array.from(this.reservations.values());
  }

  saveTransaction(t: TransactionRecord): void {
    this.transactions.set(t.id, t);
  }

  getTransaction(id: EntityId): TransactionRecord | undefined {
    return this.transactions.get(id);
  }

  getTransactionByHash(txHash: string): TransactionRecord | undefined {
    return [...this.transactions.values()].find(t => t.txHash === txHash);
  }

  listTransactionsByInvestment(investmentId: EntityId): TransactionRecord[] {
    return [...this.transactions.values()].filter(t => t.investmentId === investmentId);
  }

  listTransactionsByInvestor(investorId: EntityId): TransactionRecord[] {
    return [...this.transactions.values()].filter(t => t.investorId === investorId);
  }

  listAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactions.values());
  }

  saveSettlement(s: SettlementRecord): void {
    this.settlements.set(s.id, s);
  }

  getSettlement(id: EntityId): SettlementRecord | undefined {
    return this.settlements.get(id);
  }

  getSettlementByInvestment(investmentId: EntityId): SettlementRecord | undefined {
    return [...this.settlements.values()].find(s => s.investmentId === investmentId);
  }

  reserveSettlement(id: EntityId, processorId: string): SettlementRecord | undefined {
    const existing = this.settlements.get(id);
    if (!existing || existing.status !== "pending") return undefined;
    if (existing.processorId && existing.processorId !== processorId) return undefined;

    const reserved: SettlementRecord = {
      ...existing,
      processorId,
      claimedAt: new Date().toISOString(),
      status: "settling" as never,
    };
    this.settlements.set(id, reserved);
    return reserved;
  }

  listPendingSettlements(): SettlementRecord[] {
    return [...this.settlements.values()].filter(s => s.status === "pending");
  }

  listClaimedSettlements(processorId: string): SettlementRecord[] {
    return [...this.settlements.values()].filter(
      s => s.processorId === processorId && s.status === "settling",
    );
  }

  listStaleClaimedSettlements(claimedBefore: string): SettlementRecord[] {
    return [...this.settlements.values()].filter(
      s => s.status === "settling" && s.claimedAt && s.claimedAt < claimedBefore,
    );
  }

  saveOwnership(o: Ownership): void {
    this.ownerships.set(this.ownershipKey(o.investorId, o.propertyId), o);
  }

  getOwnership(investorId: EntityId, propertyId: EntityId): Ownership | undefined {
    return this.ownerships.get(this.ownershipKey(investorId, propertyId));
  }

  listOwnershipsByInvestor(investorId: EntityId): Ownership[] {
    return [...this.ownerships.values()].filter(o => o.investorId === investorId);
  }

  saveRecovery(r: RecoveryRecord): void {
    this.recoveries.set(r.id, r);
  }

  getRecovery(id: EntityId): RecoveryRecord | undefined {
    return this.recoveries.get(id);
  }

  getRecoveryByTransaction(transactionId: EntityId): RecoveryRecord | undefined {
    return [...this.recoveries.values()].find(r => r.transactionId === transactionId);
  }

  saveOwnershipSnapshot(s: OwnershipSnapshot): void {
    const key = `${s.investorId}:${s.propertyId}`;
    const list = this.snapshots.get(key) ?? [];
    list.push(s);
    this.snapshots.set(key, list);
  }

  listOwnershipSnapshots(investorId: EntityId, propertyId: EntityId): OwnershipSnapshot[] {
    const key = `${investorId}:${propertyId}`;
    return [...(this.snapshots.get(key) ?? [])];
  }

  saveHistoryEntry(e: InvestmentHistoryEntry): void {
    const list = this.history.get(e.investmentId) ?? [];
    list.push(e);
    this.history.set(e.investmentId, list);
  }

  listHistoryByInvestment(investmentId: EntityId): InvestmentHistoryEntry[] {
    return [...(this.history.get(investmentId) ?? [])];
  }

  saveLedgerEntry(e: LedgerEntry): void {
    const list = this.ledger.get(e.investmentId) ?? [];
    list.push(e);
    this.ledger.set(e.investmentId, list);
  }

  listLedgerEntries(investmentId: EntityId): LedgerEntry[] {
    return [...(this.ledger.get(investmentId) ?? [])];
  }

  isIdempotencyKeyUsed(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }

  markIdempotencyKey(key: string): void {
    this.idempotencyKeys.add(key);
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}

export function createInMemoryInvestmentEngineRepository(): InvestmentEngineRepository {
  return new InMemoryInvestmentEngineRepository();
}
