import { describe, it, expect } from "vitest";
import { TimeoutHandler } from "../timeout-handler";
import { DistributionSaga } from "../../saga/distribution.saga";
import type { SagaId, DistributionId } from "../../domain/value-objects";

function makeSagaId(seed = "saga-1"): SagaId {
  return seed as unknown as SagaId;
}
function makeDistId(seed = "dist-1"): DistributionId {
  return seed as unknown as DistributionId;
}
function makeRecipients(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `rec-${i + 1}`);
}

describe("TimeoutHandler", () => {
  const handler = new TimeoutHandler();
  const shortTimeout = 100;
  const farFuture = Date.now() + 60000;

  it("returns empty when no in-flight recipients", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3), {
      perRecipientTimeoutMs: shortTimeout,
    });
    const timeouts = handler.checkForTimeouts(saga);
    expect(timeouts).toHaveLength(0);
  });

  it("detects timeouts for in-flight recipients past deadline", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3), {
      perRecipientTimeoutMs: shortTimeout,
    });
    saga.nextBatch(2);

    const timeouts = handler.checkForTimeouts(saga, farFuture);
    expect(timeouts.length).toBeGreaterThanOrEqual(2);
    expect(timeouts[0]!.recipientId).toBe("rec-1");
  });

  it("returns empty when in-flight recipients within timeout", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3), {
      perRecipientTimeoutMs: 60000,
    });
    saga.nextBatch(2);

    const now = Date.now();
    const timeouts = handler.checkForTimeouts(saga, now);
    expect(timeouts).toHaveLength(0);
  });

  it("includes elapsed and timeout info in result", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1), {
      perRecipientTimeoutMs: shortTimeout,
    });
    saga.nextBatch();

    const timeouts = handler.checkForTimeouts(saga, farFuture);
    expect(timeouts[0]!.elapsedMs).toBeGreaterThan(shortTimeout);
    expect(timeouts[0]!.timeoutMs).toBe(shortTimeout);
    expect(timeouts[0]!.sagaId).toBe(saga.sagaId);
    expect(timeouts[0]!.distributionId).toBe(saga.distributionId);
  });

  it("hasTimeouts returns boolean", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
    saga.nextBatch();
    expect(handler.hasTimeouts(saga, farFuture)).toBe(true);
    expect(handler.hasTimeouts(saga, Date.now())).toBe(false);
  });

  it("returns empty for terminal sagas", () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
    saga.nextBatch();
    saga.markRecipientPaid("rec-1");
    saga.compensate("done");
    saga.complete();
    expect(handler.checkForTimeouts(saga, farFuture)).toHaveLength(0);
  });
});
