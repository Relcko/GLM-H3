/**
 * Shared primitive & branded types for the Relcko platform.
 *
 * Branded types prevent accidental mixing of id-shaped strings (entity ids,
 * chain addresses, tx hashes) at compile time while remaining plain runtime
 * strings. Constructors validate on the boundary; internal code can trust them.
 *
 * The brand uses an exported phantom field so declaration emit (and downstream
 * consumers) can name it without TS4023 errors, while still keeping a plain
 * `string` non-assignable to a branded type.
 */

export type Brand<T, B extends string> = T & { readonly __relckoBrand: B };

export type EntityId = Brand<string, "EntityId">;
export type ChainId = Brand<number, "ChainId">;
export type Address = Brand<string, "Address">;
export type TxHash = Brand<string, "TxHash">;
export type Nonce = Brand<string, "Nonce">;
export type Version = Brand<number, "Version">;
export type CorrelationId = Brand<string, "CorrelationId">;
export type TraceId = Brand<string, "TraceId">;
export type EventId = Brand<string, "EventId">;
export type IdempotencyKey = Brand<string, "IdempotencyKey">;

const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const HEX_TX = /^0x[a-fA-F0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntityId(value: unknown): value is EntityId {
  return typeof value === "string" && (UUID.test(value) || /^[\w-]{4,64}$/.test(value));
}
export function asEntityId(value: string): EntityId {
  if (!isEntityId(value)) throw new TypeError(`Invalid EntityId: ${value}`);
  return value as EntityId;
}

export function isAddress(value: unknown): value is Address {
  return typeof value === "string" && HEX_ADDRESS.test(value);
}
export function asAddress(value: string): Address {
  if (!isAddress(value)) throw new TypeError(`Invalid Address: ${value}`);
  return value.toLowerCase() as Address;
}

export function isTxHash(value: unknown): value is TxHash {
  return typeof value === "string" && HEX_TX.test(value);
}
export function asTxHash(value: string): TxHash {
  if (!isTxHash(value)) throw new TypeError(`Invalid TxHash: ${value}`);
  return value as TxHash;
}

export function asChainId(value: number): ChainId {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`Invalid ChainId: ${value}`);
  return value as ChainId;
}

export function asVersion(value: number): Version {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`Invalid Version: ${value}`);
  return value as Version;
}

export function asCorrelationId(value: string): CorrelationId {
  if (!value || typeof value !== "string") throw new TypeError("Invalid CorrelationId");
  return value as CorrelationId;
}
export function asTraceId(value: string): TraceId {
  if (!value || typeof value !== "string") throw new TypeError("Invalid TraceId");
  return value as TraceId;
}
export function asEventId(value: string): EventId {
  if (!value || typeof value !== "string") throw new TypeError("Invalid EventId");
  return value as EventId;
}
export function asIdempotencyKey(value: string): IdempotencyKey {
  if (!value || typeof value !== "string") throw new TypeError("Invalid IdempotencyKey");
  return value as IdempotencyKey;
}
