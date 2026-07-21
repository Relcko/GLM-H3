export interface OutboxRecord {
  readonly outboxId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly eventPayload: unknown;
  readonly originatingIdempotencyKey: string;
  readonly deliveredIdempotencyKey: string;
  readonly delivered: boolean;
  readonly attempts: number;
  readonly nextAttemptAt: Date | null;
  readonly createdAt: Date;
}

export interface IOutbox {
  add(
    aggregateId: string,
    eventType: string,
    eventPayload: unknown,
    originatingIdempotencyKey: string,
    deliveredIdempotencyKey: string,
  ): Promise<void>;

  markDelivered(outboxId: string): Promise<void>;

  getPending(): Promise<readonly OutboxRecord[]>;

  remove(deliveredIdempotencyKey: string): Promise<void>;
}
