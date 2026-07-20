import type { EntityId } from "@relcko/types";
import type { Investment, Ownership, Property } from "@relcko/domain-core";
import type {
  Reservation,
  TransactionRecord,
  SettlementRecord,
  RecoveryRecord,
  OwnershipSnapshot,
  InvestmentHistoryEntry,
  LedgerEntry,
} from "./types";

export interface InvestmentEngineRepository {
  saveProperty(p: Property): void;
  getProperty(id: EntityId): Property | undefined;

  saveInvestment(i: Investment): void;
  getInvestment(id: EntityId): Investment | undefined;
  listInvestmentsByInvestor(investorId: EntityId): Investment[];
  listInvestmentsByProperty(propertyId: EntityId): Investment[];

  saveReservation(r: Reservation): void;
  getReservation(id: EntityId): Reservation | undefined;
  getReservationByInvestment(investmentId: EntityId): Reservation | undefined;
  getActiveReservation(investorId: EntityId, propertyId: EntityId): Reservation | undefined;
  deleteReservation(id: EntityId): void;
  listAllReservations(): Reservation[];

  saveTransaction(t: TransactionRecord): void;
  getTransaction(id: EntityId): TransactionRecord | undefined;
  getTransactionByHash(txHash: string): TransactionRecord | undefined;
  listTransactionsByInvestment(investmentId: EntityId): TransactionRecord[];
  listTransactionsByInvestor(investorId: EntityId): TransactionRecord[];
  listAllTransactions(): TransactionRecord[];

  saveSettlement(s: SettlementRecord): void;
  getSettlement(id: EntityId): SettlementRecord | undefined;
  getSettlementByInvestment(investmentId: EntityId): SettlementRecord | undefined;

  saveOwnership(o: Ownership): void;
  getOwnership(investorId: EntityId, propertyId: EntityId): Ownership | undefined;
  listOwnershipsByInvestor(investorId: EntityId): Ownership[];

  saveRecovery(r: RecoveryRecord): void;
  getRecovery(id: EntityId): RecoveryRecord | undefined;
  getRecoveryByTransaction(transactionId: EntityId): RecoveryRecord | undefined;

  saveOwnershipSnapshot(s: OwnershipSnapshot): void;
  listOwnershipSnapshots(investorId: EntityId, propertyId: EntityId): OwnershipSnapshot[];

  saveHistoryEntry(e: InvestmentHistoryEntry): void;
  listHistoryByInvestment(investmentId: EntityId): InvestmentHistoryEntry[];

  saveLedgerEntry(e: LedgerEntry): void;
  listLedgerEntries(investmentId: EntityId): LedgerEntry[];

  isIdempotencyKeyUsed(key: string): boolean;
  markIdempotencyKey(key: string): void;

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
