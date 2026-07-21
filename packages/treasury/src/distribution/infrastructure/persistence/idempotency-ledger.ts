import type { IIdempotencyLedger, IdempotencyRecord } from "../../saga/idempotency-ledger.interface";

export class InMemoryIdempotencyLedger implements IIdempotencyLedger {
  private readonly records = new Map<string, IdempotencyRecord>();

  async record(
    key: string,
    commandType: string,
    aggregateId: string,
    actorId: string,
    requestHash: string,
    responsePayload: unknown,
    responseStatus: string,
    producedEvents: string[],
  ): Promise<void> {
    this.records.set(key, {
      idempotencyKey: key,
      commandType,
      aggregateId,
      actorId,
      requestHash,
      responsePayload,
      responseStatus,
      producedEvents,
      createdAt: new Date(),
    });
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    return this.records.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.records.has(key);
  }

  clear(): void {
    this.records.clear();
  }

  count(): number {
    return this.records.size;
  }
}
