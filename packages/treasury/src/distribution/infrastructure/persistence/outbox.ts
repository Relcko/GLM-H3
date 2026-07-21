import crypto from "node:crypto";
import type { IOutbox, OutboxRecord } from "../../saga/outbox.interface";

export class InMemoryOutbox implements IOutbox {
  private readonly records: OutboxRecord[] = [];

  async add(
    aggregateId: string,
    eventType: string,
    eventPayload: unknown,
    originatingIdempotencyKey: string,
    deliveredIdempotencyKey: string,
  ): Promise<void> {
    this.records.push({
      outboxId: crypto.randomUUID(),
      aggregateId,
      eventType,
      eventPayload,
      originatingIdempotencyKey,
      deliveredIdempotencyKey,
      delivered: false,
      attempts: 0,
      nextAttemptAt: null,
      createdAt: new Date(),
    });
  }

  async markDelivered(outboxId: string): Promise<void> {
    const record = this.records.find((r) => r.outboxId === outboxId);
    if (record) {
      const idx = this.records.indexOf(record);
      this.records[idx] = { ...record, delivered: true };
    }
  }

  async getPending(): Promise<readonly OutboxRecord[]> {
    return this.records.filter((r) => !r.delivered);
  }

  getAll(): readonly OutboxRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records.length = 0;
  }

  count(): number {
    return this.records.length;
  }
}
