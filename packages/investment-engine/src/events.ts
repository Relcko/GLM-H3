import type { EntityId, Json, Metadata } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const InvestmentEventType = {
  InvestmentRequested: "investment.requested",
  InvestmentEligibilityPassed: "investment.eligibility_passed",
  InvestmentEligibilityFailed: "investment.eligibility_failed",
  InvestmentReserved: "investment.reserved",
  ReservationExpired: "investment.reservation_expired",
  ReservationCancelled: "investment.reservation_cancelled",
  WalletConfirmed: "investment.wallet_confirmed",
  WalletRejected: "investment.wallet_rejected",
  TransactionSubmitted: "investment.transaction_submitted",
  TransactionConfirmed: "investment.transaction_confirmed",
  TransactionFailed: "investment.transaction_failed",
  TransactionCancelled: "investment.transaction_cancelled",
  TransactionExpired: "investment.transaction_expired",
  TransactionRecovered: "investment.transaction_recovered",
  TransactionRetried: "investment.transaction_retried",
  SettlementStarted: "investment.settlement_started",
  SettlementCompleted: "investment.settlement_completed",
  SettlementFailed: "investment.settlement_failed",
  OwnershipAllocated: "investment.ownership_allocated",
  OwnershipUpdated: "investment.ownership_updated",
  OwnershipSnapshotGenerated: "investment.ownership_snapshot_generated",
  LedgerRecorded: "investment.ledger_recorded",
  RecoveryStarted: "investment.recovery_started",
  RecoveryResolved: "investment.recovery_resolved",
  RecoveryFailed: "investment.recovery_failed",
  PortfolioUpdated: "investment.portfolio_updated",
  InvestmentCompleted: "investment.completed",
  InvestmentAuditLogged: "investment.audit_logged",
} as const;

export type InvestmentEventType = (typeof InvestmentEventType)[keyof typeof InvestmentEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export async function publishInvestmentEvent(
  bus: EventBus,
  type: string,
  aggregateId: EntityId,
  actorId: EntityId,
  payload: Json,
  options: PublishEventOptions = {},
): Promise<void> {
  const envelope = createEnvelope({
    type,
    aggregateId,
    actorId,
    payload,
    source: "relcko.investment-engine",
    ...options,
  });
  await bus.publish(envelope);
}
