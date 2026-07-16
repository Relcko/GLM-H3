import type { Currency } from "./enums";

/**
 * Money is stored as integer minor units (e.g. cents / USDT 6-decimals) to
 * avoid floating-point drift. `currency` is required for correctness.
 */
export interface Money {
  readonly amount: bigint; // minor units, non-negative
  readonly currency: Currency;
}

/** ISO-8601 timestamp string. */
export type Timestamp = string;

/** A generic, serializable payload for events / DTOs. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Paging cursor for read models. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Standard key/value metadata bag carried on envelopes and audit entries. */
export type Metadata = Readonly<Record<string, Json | undefined>>;
