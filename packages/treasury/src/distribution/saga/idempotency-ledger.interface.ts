export interface IdempotencyRecord {
  readonly idempotencyKey: string;
  readonly commandType: string;
  readonly aggregateId: string;
  readonly actorId: string;
  readonly requestHash: string;
  readonly responsePayload: unknown;
  readonly responseStatus: string;
  readonly producedEvents: readonly string[];
  readonly createdAt: Date;
}

export interface IIdempotencyLedger {
  record(
    key: string,
    commandType: string,
    aggregateId: string,
    actorId: string,
    requestHash: string,
    responsePayload: unknown,
    responseStatus: string,
    producedEvents: string[],
  ): Promise<void>;

  get(key: string): Promise<IdempotencyRecord | null>;

  exists(key: string): Promise<boolean>;
}
