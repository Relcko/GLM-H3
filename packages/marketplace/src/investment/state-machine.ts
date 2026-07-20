import { InvestmentStatus, transitionInvestment, type Investment } from "@relcko/domain-core";
import { MarketplaceEventType } from "../events";

/**
 * Investment state machine. Wraps the FROZEN `transitionInvestment` from
 * `@relcko/domain-core`. The richer investment workflow (reserve, confirm,
 * cancel, fund, settle, complete, fail, refund) maps onto the frozen statuses
 * without introducing new business states:
 *
 *   reserve   -> Pending        (Reservation)
 *   confirm   -> Pending→Processing   (Confirmation)
 *   fund      -> Processing      (Funding, no state change)
 *   settle    -> Processing→Confirmed (Settlement & Completion)
 *   cancel    -> Pending→Failed  (Cancellation)
 *   fail      -> →Failed         (Failure)
 *   refund    -> Failed→Refunded (Refund)
 */
export interface InvestmentWorkflowStep {
  readonly from: InvestmentStatus;
  readonly to: InvestmentStatus;
  readonly event: string;
}

export const INVESTMENT_WORKFLOW: ReadonlyArray<InvestmentWorkflowStep> = [
  { from: InvestmentStatus.Pending, to: InvestmentStatus.Processing, event: MarketplaceEventType.InvestmentConfirmed },
  { from: InvestmentStatus.Processing, to: InvestmentStatus.Confirmed, event: MarketplaceEventType.InvestmentSettled },
  { from: InvestmentStatus.Pending, to: InvestmentStatus.Failed, event: MarketplaceEventType.InvestmentCancelled },
  { from: InvestmentStatus.Pending, to: InvestmentStatus.Failed, event: MarketplaceEventType.InvestmentFailed },
  { from: InvestmentStatus.Processing, to: InvestmentStatus.Failed, event: MarketplaceEventType.InvestmentFailed },
  { from: InvestmentStatus.Failed, to: InvestmentStatus.Refunded, event: MarketplaceEventType.InvestmentRefunded },
];

export class InvestmentStateMachine {
  canTransition(current: InvestmentStatus, next: InvestmentStatus): boolean {
    try {
      transitionInvestment({ status: current } as unknown as Investment, next);
      return true;
    } catch {
      return false;
    }
  }

  transition(investment: Investment, next: InvestmentStatus): Investment {
    return transitionInvestment(investment, next);
  }
}
