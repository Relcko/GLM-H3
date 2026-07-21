import { DistributionSaga } from "../saga/distribution.saga";
import type { DistributionRecipientAggregate } from "../domain/distribution-recipient.aggregate";
import type { DistributionId, RecipientId, SagaId } from "../domain/value-objects";
import type {
  IDistributionRecipientRepository,
} from "../application/repositories";
import type { IPaymentGateway, PaymentRequest } from "../infrastructure/adapters/payment-gateway.interface";
import type { IRecoveryPolicy } from "../saga/recovery-policy.interface";
import type { IIdempotencyLedger } from "../saga/idempotency-ledger.interface";
import { SettlementReferenceService } from "./settlement-ref.service";
import { classifyPaymentResult, PaymentOutcome, type ClassifiedResult } from "./payment-classifier";
import { RetryEngine, type RetrySchedule } from "./retry-engine";
import type { FailureInfo } from "../saga/recovery-policy.interface";
import {
  PaymentRequestedEvent,
  PaymentInitiatedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentRetryScheduledEvent,
  PaymentTimedOutEvent,
  type PaymentDomainEvent,
} from "./payment-lifecycle.event";

export interface PaymentOrchestratorDeps {
  readonly recipientRepo: IDistributionRecipientRepository;
  readonly paymentGateway: IPaymentGateway;
  readonly settlementRefService: SettlementReferenceService;
  readonly retryEngine: RetryEngine;
  readonly recoveryPolicyProvider: (policyId: string | null) => IRecoveryPolicy;
  readonly sourceAccountId: string;
  readonly idempotencyLedger: IIdempotencyLedger;
}

export interface PaymentBatchResult {
  readonly processed: PaymentRecipientResult[];
  readonly lifecycleEvents: PaymentDomainEvent[];
}

export interface PaymentRecipientResult {
  readonly recipientId: string;
  readonly outcome: PaymentOutcome;
  readonly settlementRef: string;
  readonly txHash: string | null;
  readonly errorCode: string | null;
  readonly retrySchedule: RetrySchedule | null;
}

export class PaymentOrchestrator {
  private eventVersion = 0;

  constructor(private readonly deps: PaymentOrchestratorDeps) {}

  async processBatch(
    saga: DistributionSaga,
    batch: string[],
    manifestHash: string,
  ): Promise<PaymentBatchResult> {
    const results: PaymentRecipientResult[] = [];
    const lifecycleEvents: PaymentDomainEvent[] = [];

    for (const recipientId of batch) {
      const rid = recipientId as unknown as RecipientId;
      const recipient = await this.deps.recipientRepo.findById(rid);
      if (!recipient) continue;

      const settlementRef = this.deps.settlementRefService.computeSettlementRef(
        String(saga.distributionId),
        recipientId,
        manifestHash,
      );

      const paymentClaimKey = `saga:${saga.sagaId}:payment:${settlementRef}`;
      const claimed = await this.deps.idempotencyLedger.tryRecord(
        paymentClaimKey,
        "payment.process",
        String(saga.sagaId),
        "payment-orchestrator",
        settlementRef,
        {},
        "claimed",
        [],
      );
      if (!claimed) continue;

      this.eventVersion += 1;
      lifecycleEvents.push(
        new PaymentRequestedEvent(
          `saga:${saga.sagaId}`,
          this.eventVersion,
          {
            distributionId: String(saga.distributionId),
            sagaId: String(saga.sagaId),
            recipientId,
            investorId: recipient.investorId,
            amount: recipient.eligibleAmount,
            currency: recipient.currency,
            settlementRef,
            requestedAt: Date.now(),
          },
        ),
      );

      const startTime = Date.now();

      this.eventVersion += 1;
      lifecycleEvents.push(
        new PaymentInitiatedEvent(
          `saga:${saga.sagaId}`,
          this.eventVersion,
          {
            distributionId: String(saga.distributionId),
            sagaId: String(saga.sagaId),
            recipientId,
            settlementRef,
            initiatedAt: startTime,
          },
        ),
      );

      const paymentRequest: PaymentRequest = {
        recipientId,
        investorId: recipient.investorId,
        amount: recipient.eligibleAmount,
        currency: recipient.currency,
        settlementRef,
        sourceAccountId: this.deps.sourceAccountId,
      };

      let result: ClassifiedResult;
      try {
        const gatewayResult = await this.deps.paymentGateway.processPayment(paymentRequest);
        const elapsed = Date.now() - startTime;
        result = classifyPaymentResult(gatewayResult, elapsed, saga.perRecipientTimeoutMs);
      } catch (error) {
        const elapsed = Date.now() - startTime;
        result = {
          outcome: elapsed >= saga.perRecipientTimeoutMs ? PaymentOutcome.Timeout : PaymentOutcome.RetryableFailure,
          txHash: null,
          errorCode: "GATEWAY_ERROR",
          errorMessage: error instanceof Error ? error.message : "Gateway threw exception",
        };
      }

      this.eventVersion += 1;

      switch (result.outcome) {
        case PaymentOutcome.Success: {
          lifecycleEvents.push(
            new PaymentSucceededEvent(
              `saga:${saga.sagaId}`,
              this.eventVersion,
              {
                distributionId: String(saga.distributionId),
                sagaId: String(saga.sagaId),
                recipientId,
                settlementRef,
                txHash: result.txHash ?? settlementRef,
                completedAt: Date.now(),
              },
            ),
          );
          saga.markRecipientPaid(recipientId);
          results.push({
            recipientId,
            outcome: PaymentOutcome.Success,
            settlementRef,
            txHash: result.txHash,
            errorCode: null,
            retrySchedule: null,
          });
          break;
        }
        case PaymentOutcome.Timeout: {
          lifecycleEvents.push(
            new PaymentTimedOutEvent(
              `saga:${saga.sagaId}`,
              this.eventVersion,
              {
                distributionId: String(saga.distributionId),
                sagaId: String(saga.sagaId),
                recipientId,
                settlementRef,
                timedOutAt: Date.now(),
              },
            ),
          );
          const retrySchedule = this.scheduleRetry(saga, recipient, recipientId, result);
          if (retrySchedule.canRetry) {
            results.push({
              recipientId,
              outcome: PaymentOutcome.RetryableFailure,
              settlementRef,
              txHash: result.txHash,
              errorCode: result.errorCode,
              retrySchedule,
            });
          } else {
            saga.markRecipientFailed(recipientId);
            results.push({
              recipientId,
              outcome: PaymentOutcome.NonRetryableFailure,
              settlementRef,
              txHash: result.txHash,
              errorCode: result.errorCode,
              retrySchedule: null,
            });
          }
          break;
        }
        case PaymentOutcome.RetryableFailure: {
          const retrySchedule = this.scheduleRetry(saga, recipient, recipientId, result);
          if (retrySchedule.canRetry) {
            lifecycleEvents.push(
              new PaymentRetryScheduledEvent(
                `saga:${saga.sagaId}`,
                this.eventVersion,
                {
                  distributionId: String(saga.distributionId),
                  sagaId: String(saga.sagaId),
                  recipientId,
                  settlementRef,
                  attemptNumber: retrySchedule.attemptNumber,
                  nextRetryAt: retrySchedule.nextRetryAt ?? 0,
                  errorCode: result.errorCode ?? "RETRYABLE",
                  reason: result.errorMessage ?? "Retryable gateway error",
                },
              ),
            );
            results.push({
              recipientId,
              outcome: PaymentOutcome.RetryableFailure,
              settlementRef,
              txHash: result.txHash,
              errorCode: result.errorCode,
              retrySchedule,
            });
          } else {
            saga.markRecipientFailed(recipientId);
            results.push({
              recipientId,
              outcome: PaymentOutcome.NonRetryableFailure,
              settlementRef,
              txHash: result.txHash,
              errorCode: result.errorCode,
              retrySchedule: null,
            });
          }
          break;
        }
        case PaymentOutcome.NonRetryableFailure:
        case PaymentOutcome.Unknown: {
          lifecycleEvents.push(
            new PaymentFailedEvent(
              `saga:${saga.sagaId}`,
              this.eventVersion,
              {
                distributionId: String(saga.distributionId),
                sagaId: String(saga.sagaId),
                recipientId,
                settlementRef,
                errorCode: result.errorCode ?? "UNKNOWN",
                reason: result.errorMessage ?? "Non-retryable gateway error",
                failedAt: Date.now(),
              },
            ),
          );
          saga.markRecipientFailed(recipientId);
          results.push({
            recipientId,
            outcome: PaymentOutcome.NonRetryableFailure,
            settlementRef,
            txHash: result.txHash,
            errorCode: result.errorCode,
            retrySchedule: null,
          });
          break;
        }
      }
    }

    return { processed: results, lifecycleEvents };
  }

  private scheduleRetry(
    saga: DistributionSaga,
    recipient: DistributionRecipientAggregate,
    recipientId: string,
    result: ClassifiedResult,
  ): RetrySchedule {
    const recoveryPolicy = this.deps.recoveryPolicyProvider(saga.recoveryPolicyId);
    const failureInfo: FailureInfo = {
      errorCode: result.errorCode ?? "UNKNOWN",
      reason: result.errorMessage ?? "Gateway error",
      attemptNumber: recipient.recoveryAttempts + 1,
    };

    const schedule = this.deps.retryEngine.computeRetrySchedule(recoveryPolicy, failureInfo);

    return schedule;
  }
}
