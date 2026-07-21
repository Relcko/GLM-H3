import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentOrchestrator, type PaymentOrchestratorDeps } from "../payment-orchestrator";
import { SettlementReferenceService } from "../settlement-ref.service";
import { RetryEngine } from "../retry-engine";
import { PaymentOutcome } from "../payment-classifier";
import { DistributionSaga } from "../../saga/distribution.saga";
import { DistributionRecipientAggregate } from "../../domain/distribution-recipient.aggregate";
import { EligibilityProof, RecoveryStrategy, DistributionType } from "../../domain/value-objects";
import type { SagaId, DistributionId, RecipientId } from "../../domain/value-objects";
import type { IPaymentGateway, PaymentResult } from "../../infrastructure/adapters/payment-gateway.interface";
import type { IRecoveryPolicy } from "../../saga/recovery-policy.interface";
import type { IDistributionRecipientRepository } from "../../application/repositories";
import { InMemoryIdempotencyLedger } from "../../infrastructure/persistence/idempotency-ledger";
import type { IIdempotencyLedger } from "../../saga/idempotency-ledger.interface";

function makeSagaId(seed = "saga-1"): SagaId { return seed as unknown as SagaId; }
function makeDistId(seed = "dist-1"): DistributionId { return seed as unknown as DistributionId; }
function makeRecId(seed = "rec-1"): RecipientId { return seed as unknown as RecipientId; }

function makeRecipient(id: RecipientId, distId: DistributionId): DistributionRecipientAggregate {
  const proof = EligibilityProof.create({
    snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 10n, hash: "hash",
  });
  return DistributionRecipientAggregate.create(id, distId, "inv-1", 1000n, "USDT", proof);
}

function makePolicy(): IRecoveryPolicy {
  return {
    maxAttempts: 3,
    strategy: RecoveryStrategy.ReAttempt,
    shouldRetry: () => true,
    isExhausted: (a: number) => a >= 3,
  };
}

describe("PaymentOrchestrator", () => {
  let recipientRepo: IDistributionRecipientRepository;
  let gateway: IPaymentGateway;
  let settlementRefService: SettlementReferenceService;
  let retryEngine: RetryEngine;
  let orchestrator: PaymentOrchestrator;
  let saga: DistributionSaga;
  let recipients: Map<string, DistributionRecipientAggregate>;
  let idempotencyLedger: IIdempotencyLedger;

  beforeEach(() => {
    recipients = new Map();

    recipientRepo = {
      findById: vi.fn(async (id: RecipientId) => recipients.get(String(id)) ?? null),
      getById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findByDistributionId: vi.fn(),
      findByInvestorId: vi.fn(),
      findByDistributionAndInvestor: vi.fn(),
    };

    gateway = {
      processPayment: vi.fn(),
      getStatus: vi.fn(),
    };

    idempotencyLedger = new InMemoryIdempotencyLedger();
    settlementRefService = new SettlementReferenceService();
    retryEngine = new RetryEngine(5000);

    orchestrator = new PaymentOrchestrator({
      recipientRepo,
      paymentGateway: gateway,
      settlementRefService,
      retryEngine,
      recoveryPolicyProvider: () => makePolicy(),
      sourceAccountId: "src-acct-1",
      idempotencyLedger,
    });

    const distId = makeDistId("dist-orch");
    saga = DistributionSaga.start(makeSagaId("saga-orch"), distId, ["rec-1", "rec-2", "rec-3"], {
      maxParallelism: 2,
      perRecipientTimeoutMs: 30000,
    });

    for (let i = 1; i <= 3; i++) {
      const rid = makeRecId(`rec-${i}`);
      const r = makeRecipient(rid, distId);
      recipients.set(`rec-${i}`, r);
    }
  });

  describe("success", () => {
    it("processes a batch of recipients successfully", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0xabc", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(2);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed).toHaveLength(2);
      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.Success);
      expect(result.processed[1]!.outcome).toBe(PaymentOutcome.Success);
      expect(saga.paidCount).toBe(2);
      expect(result.lifecycleEvents.length).toBeGreaterThanOrEqual(4);
      expect(result.lifecycleEvents[0]!.eventType).toBe("treasury.payment.requested");
      expect(result.lifecycleEvents[3]!.eventType).toBe("treasury.payment.requested");
    });

    it("generates settlement ref server-side", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0xdef", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.settlementRef).toMatch(/^[a-f0-9]{64}$/);
      expect(result.processed[0]!.settlementRef).toBe(
        settlementRefService.computeSettlementRef(String(saga.distributionId), "rec-1", "manifest-1"),
      );
    });
  });

  describe("failure classification", () => {
    it("marks recipient failed on non-retryable error", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "INVALID_ACCOUNT", errorMessage: "Bad account",
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.NonRetryableFailure);
      expect(saga.paidCount).toBe(0);
      expect(saga.failedCount).toBe(1);
    });

    it("schedules retry on retryable failure", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "GATEWAY_TIMEOUT", errorMessage: "Timeout",
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.RetryableFailure);
      expect(result.processed[0]!.retrySchedule).not.toBeNull();
      expect(result.processed[0]!.retrySchedule!.canRetry).toBe(true);
    });

    it("marks recipient failed on exhausted retries (policy says exhausted)", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "NETWORK_ERROR", errorMessage: "Network error",
      });

      const exhaustedPolicy: IRecoveryPolicy = {
        maxAttempts: 1,
        strategy: RecoveryStrategy.ReAttempt,
        shouldRetry: () => true,
        isExhausted: () => true,
      };

      const exhaustedOrch = new PaymentOrchestrator({
        recipientRepo,
        paymentGateway: gateway,
        settlementRefService,
        retryEngine,
        recoveryPolicyProvider: () => exhaustedPolicy,
        sourceAccountId: "src-acct-1",
        idempotencyLedger,
      });

      const batch = saga.nextBatch(1);

      const distId = saga.distributionId;
      const rid = makeRecId(batch[0]!);
      const recipient = recipients.get(batch[0]!)!;
      vi.mocked(recipientRepo.findById).mockResolvedValue(recipient);

      const result = await exhaustedOrch.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.NonRetryableFailure);
      expect(saga.failedCount).toBe(1);
    });
  });

  describe("timeout", () => {
    it("classifies as retryable when gateway reports GATEWAY_TIMEOUT error code", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "GATEWAY_TIMEOUT", errorMessage: "Gateway timed out",
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.RetryableFailure);
      expect(result.processed[0]!.errorCode).toBe("GATEWAY_TIMEOUT");
    });
  });

  describe("gateway exception", () => {
    it("handles gateway throwing an exception", async () => {
      vi.mocked(gateway.processPayment).mockRejectedValue(new Error("Connection refused"));

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.RetryableFailure);
      expect(result.processed[0]!.errorCode).toBe("GATEWAY_ERROR");
    });
  });

  describe("idempotency claim", () => {
    it("skips recipient when payment already claimed by another worker", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0xdup", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(2);

      const claimRef = settlementRefService.computeSettlementRef(String(saga.distributionId), "rec-1", "manifest-1");
      await idempotencyLedger.record(
        `saga:${saga.sagaId}:payment:${claimRef}:attempt:1`,
        "payment.process", String(saga.sagaId), "other-worker", "ref", {}, "claimed", [],
      );

      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed).toHaveLength(1);
      expect(result.processed[0]!.recipientId).toBe("rec-2");
      expect(gateway.processPayment).toHaveBeenCalledTimes(1);
    });

    it("processes recipient when claim succeeds", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0xabc", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      expect(result.processed).toHaveLength(1);
      expect(result.processed[0]!.outcome).toBe(PaymentOutcome.Success);
    });

    it("creates claim entry in ledger for each processed payment", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0x123", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(1);
      await orchestrator.processBatch(saga, batch, "manifest-1");

      const settlementRef = settlementRefService.computeSettlementRef(String(saga.distributionId), "rec-1", "manifest-1");
      const claimKey = `saga:${saga.sagaId}:payment:${settlementRef}:attempt:1`;
      const record = await idempotencyLedger.get(claimKey);
      expect(record).not.toBeNull();
      expect(record!.commandType).toBe("payment.process");
    });
  });

  describe("lifecycle events", () => {
    it("emits correct event sequence for success", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: true, txHash: "0x123", errorCode: null, errorMessage: null,
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      const types = result.lifecycleEvents.map((e) => e.eventType);
      expect(types).toContain("treasury.payment.requested");
      expect(types).toContain("treasury.payment.initiated");
      expect(types).toContain("treasury.payment.succeeded");
    });

    it("emits failed event for non-retryable failure", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "ACCOUNT_CLOSED", errorMessage: "Closed",
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      const types = result.lifecycleEvents.map((e) => e.eventType);
      expect(types).toContain("treasury.payment.failed");
    });

    it("emits retry_scheduled event for retryable failure", async () => {
      vi.mocked(gateway.processPayment).mockResolvedValue({
        success: false, txHash: null, errorCode: "RATE_LIMITED", errorMessage: "Rate limited",
      });

      const batch = saga.nextBatch(1);
      const result = await orchestrator.processBatch(saga, batch, "manifest-1");

      const types = result.lifecycleEvents.map((e) => e.eventType);
      expect(types).toContain("treasury.payment.retry_scheduled");
    });
  });
});
