import type { EntityId, Json, Metadata } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const TreasuryEventType = {
  AccountCreated: "treasury.account_created",
  AccountUpdated: "treasury.account_updated",
  JournalPosted: "treasury.journal_posted",
  JournalReversed: "treasury.journal_reversed",
  AllocationExecuted: "treasury.allocation_executed",
  ReserveConfigured: "treasury.reserve_configured",
  MovementCreated: "treasury.movement_created",
  MovementApproved: "treasury.movement_approved",
  MovementCompleted: "treasury.movement_completed",
  ReconciliationPerformed: "treasury.reconciliation_performed",
  DividendProposed: "treasury.dividend_proposed",
  DividendApproved: "treasury.dividend_approved",
  DividendDistributed: "treasury.dividend_distributed",
  DividendRecovered: "treasury.dividend_recovered",
  DividendRejected: "treasury.dividend_rejected",
  DividendScheduleCreated: "treasury.dividend_schedule_created",
  DividendScheduled: "treasury.dividend_scheduled",
  OwnershipSnapshotted: "treasury.ownership_snapshotted",
  DividendCompleted: "treasury.dividend_completed",
  DividendClaimInitiated: "treasury.dividend_claim_initiated",
  DividendClaimed: "treasury.dividend_claimed",
  DividendClaimPaid: "treasury.dividend_claim_paid",
  DividendClaimCompleted: "treasury.dividend_claim_completed",
  DividendClaimExpired: "treasury.dividend_claim_expired",
  DividendClaimDisputed: "treasury.dividend_claim_disputed",
  DividendClaimReversed: "treasury.dividend_claim_reversed",
  BuybackRequested: "treasury.buyback_requested",
  BuybackApproved: "treasury.buyback_approved",
  BuybackCompleted: "treasury.buyback_completed",
  BuybackCancelled: "treasury.buyback_cancelled",
  BurnRequested: "treasury.burn_requested",
  BurnApproved: "treasury.burn_approved",
  BurnCompleted: "treasury.burn_completed",
  BurnCancelled: "treasury.burn_cancelled",
  MovementRejected: "treasury.movement_rejected",
  MovementApprovedMultiSig: "treasury.movement_approved_multisig",
  TreasuryDeposit: "treasury.deposit",
  TreasuryWithdrawal: "treasury.withdrawal",
  TreasuryRebalanced: "treasury.rebalanced",
  TreasuryYieldRealized: "treasury.yield_realized",
  CashflowProjected: "treasury.cashflow_projected",
  StatementGenerated: "treasury.statement_generated",
  ReportGenerated: "treasury.report_generated",
  AnalyticsComputed: "treasury.analytics_computed",
  HealthChecked: "treasury.health_checked",
} as const;

export type TreasuryEventType = (typeof TreasuryEventType)[keyof typeof TreasuryEventType];

export async function publishTreasuryEvent(
  bus: EventBus,
  type: string,
  aggregateId: EntityId,
  actorId: EntityId,
  payload: Json,
  options?: { correlationId?: string; traceId?: string; idempotencyKey?: string; metadata?: Metadata },
): Promise<void> {
  const envelope = createEnvelope({ type, aggregateId, actorId, payload, source: "relcko.treasury", ...options });
  await bus.publish(envelope);
}
