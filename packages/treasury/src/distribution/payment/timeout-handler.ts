import type { DistributionSaga } from "../saga/distribution.saga";
import type { SagaId, DistributionId } from "../domain/value-objects";

export interface TimedOutRecipient {
  readonly sagaId: SagaId;
  readonly distributionId: DistributionId;
  readonly recipientId: string;
  readonly elapsedMs: number;
  readonly timeoutMs: number;
  readonly timedOutAt: number;
}

export class TimeoutHandler {
  checkForTimeouts(
    saga: DistributionSaga,
    now: number = Date.now(),
  ): TimedOutRecipient[] {
    if (saga.inFlightRecipients.length === 0) return [];

    const timedOut: TimedOutRecipient[] = [];

    const baseTime = saga.checkpointAt > 0 ? saga.checkpointAt : saga.startedAt;
    for (const recipientId of saga.inFlightRecipients) {
      const elapsedMs = now - baseTime;
      if (elapsedMs >= saga.perRecipientTimeoutMs) {
        timedOut.push({
          sagaId: saga.sagaId,
          distributionId: saga.distributionId,
          recipientId,
          elapsedMs,
          timeoutMs: saga.perRecipientTimeoutMs,
          timedOutAt: now,
        });
      }
    }

    return timedOut;
  }

  hasTimeouts(saga: DistributionSaga, now: number = Date.now()): boolean {
    return this.checkForTimeouts(saga, now).length > 0;
  }
}
