import type { AggregateRoot, DomainEvent } from "@relcko/kernel";
import { toEventEnvelope } from "@relcko/kernel";
import type { EventStore, AppendOptions, EventDeserializer } from "@relcko/event-store";
import { streamIdFor } from "@relcko/event-store";
import type { EventEnvelope } from "@relcko/events";
import type { IOutbox } from "../../saga/outbox.interface";
import type { IIdempotencyLedger } from "../../saga/idempotency-ledger.interface";

export interface PendingAppend {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly events: readonly DomainEvent[];
  readonly expectedVersion: number;
}

export interface PendingOutboxEntry {
  readonly aggregateId: string;
  readonly eventType: string;
  readonly eventPayload: unknown;
  readonly originatingIdempotencyKey: string;
  readonly deliveredIdempotencyKey: string;
}

export interface PendingIdempotencyRecord {
  readonly key: string;
  readonly commandType: string;
  readonly aggregateId: string;
  readonly actorId: string;
  readonly requestHash: string;
  readonly responsePayload: unknown;
  readonly responseStatus: string;
  readonly producedEvents: readonly string[];
}

export interface UnacknowledgedAppend {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly streamId: string;
  readonly expectedVersion: number;
  readonly eventCount: number;
  readonly timestamp: number;
  readonly failedPhase: "outbox" | "idempotency";
}

export type PartialCommitCallback = (entry: UnacknowledgedAppend) => void;

export class UnitOfWork {
  private readonly pendingAppends: PendingAppend[] = [];
  private readonly pendingOutbox: PendingOutboxEntry[] = [];
  private readonly pendingIdempotency: PendingIdempotencyRecord[] = [];
  private _committed = false;
  private _rolledBack = false;

  constructor(
    private readonly eventStore: EventStore,
    private readonly outbox: IOutbox,
    private readonly idempotencyLedger: IIdempotencyLedger,
    private readonly onPartialCommit?: PartialCommitCallback,
  ) {}

  get committed(): boolean { return this._committed; }
  get rolledBack(): boolean { return this._rolledBack; }
  get hasPendingWork(): boolean {
    return this.pendingAppends.length > 0 || this.pendingOutbox.length > 0 || this.pendingIdempotency.length > 0;
  }

  registerAppend(
    aggregateType: string,
    aggregateId: string,
    events: readonly DomainEvent[],
    expectedVersion: number,
  ): void {
    this.assertActive();
    if (events.length === 0) return;
    this.pendingAppends.push({ aggregateType, aggregateId, events, expectedVersion });
  }

  registerOutbox(
    aggregateId: string,
    eventType: string,
    eventPayload: unknown,
    originatingIdempotencyKey: string,
    deliveredIdempotencyKey: string,
  ): void {
    this.assertActive();
    this.pendingOutbox.push({
      aggregateId, eventType, eventPayload,
      originatingIdempotencyKey, deliveredIdempotencyKey,
    });
  }

  registerIdempotency(
    key: string,
    commandType: string,
    aggregateId: string,
    actorId: string,
    requestHash: string,
    responsePayload: unknown,
    producedEvents: readonly string[],
  ): void {
    this.assertActive();
    this.pendingIdempotency.push({
      key, commandType, aggregateId, actorId, requestHash,
      responsePayload, responseStatus: "success", producedEvents,
    });
  }

  async commit(): Promise<void> {
    this.assertActive();
    if (!this.hasPendingWork) {
      this._committed = true;
      return;
    }

    let eventStoreDone = false;
    let outboxDone = false;
    const addedOutboxKeys: string[] = [];
    const recordedIdempotencyKeys: string[] = [];

    try {
      for (const append of this.pendingAppends) {
        const streamId = streamIdFor(append.aggregateType, append.aggregateId);
        const envelopes: EventEnvelope[] = append.events.map((event) =>
          toEventEnvelope(
            event,
            (event as unknown as { data: Record<string, unknown> }).data ?? {},
            append.aggregateId,
            append.aggregateType,
            { producer: `treasury.${append.aggregateType}` },
          ),
        );
        await this.eventStore.append(streamId, envelopes, {
          expectedVersion: append.expectedVersion,
        } as AppendOptions);
      }
      eventStoreDone = true;

      for (const entry of this.pendingOutbox) {
        await this.outbox.add(
          entry.aggregateId, entry.eventType, entry.eventPayload,
          entry.originatingIdempotencyKey, entry.deliveredIdempotencyKey,
        );
        addedOutboxKeys.push(entry.deliveredIdempotencyKey);
      }
      outboxDone = true;

      for (const rec of this.pendingIdempotency) {
        await this.idempotencyLedger.record(
          rec.key, rec.commandType, rec.aggregateId, rec.actorId,
          rec.requestHash, rec.responsePayload, rec.responseStatus,
          rec.producedEvents as string[],
        );
        recordedIdempotencyKeys.push(rec.key);
      }

      this._committed = true;
    } catch (error) {
      this._rolledBack = true;

      for (const key of recordedIdempotencyKeys) {
        try { await this.idempotencyLedger.delete(key); } catch { /* best effort */ }
      }

      for (const key of addedOutboxKeys) {
        try { await this.outbox.remove(key); } catch { /* best effort */ }
      }

      if (eventStoreDone && this.onPartialCommit) {
        const failedPhase = outboxDone ? "idempotency" : "outbox";
        for (const append of this.pendingAppends) {
          this.onPartialCommit({
            aggregateType: append.aggregateType,
            aggregateId: append.aggregateId,
            streamId: streamIdFor(append.aggregateType, append.aggregateId),
            expectedVersion: append.expectedVersion,
            eventCount: append.events.length,
            timestamp: Date.now(),
            failedPhase,
          });
        }
      }

      throw error;
    }
  }

  async rollback(): Promise<void> {
    this.assertActive();
    this._rolledBack = true;
  }

  private assertActive(): void {
    if (this._committed) throw new UnitOfWorkError("already committed");
    if (this._rolledBack) throw new UnitOfWorkError("already rolled back");
  }
}

export class UnitOfWorkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitOfWorkError";
  }
}

export interface UnitOfWorkFactory {
  create(): UnitOfWork;
  getUnacknowledgedAppends(): readonly UnacknowledgedAppend[];
}

export class DefaultUnitOfWorkFactory implements UnitOfWorkFactory {
  private readonly _unacknowledgedAppends: UnacknowledgedAppend[] = [];

  constructor(
    private readonly eventStore: EventStore,
    private readonly outbox: IOutbox,
    private readonly idempotencyLedger: IIdempotencyLedger,
  ) {}

  create(): UnitOfWork {
    return new UnitOfWork(this.eventStore, this.outbox, this.idempotencyLedger, (entry) => {
      this._unacknowledgedAppends.push(entry);
    });
  }

  getUnacknowledgedAppends(): readonly UnacknowledgedAppend[] {
    return [...this._unacknowledgedAppends];
  }

  clearUnacknowledgedAppends(): void {
    this._unacknowledgedAppends.length = 0;
  }
}
