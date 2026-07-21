export const Currency = {
  USDT: "USDT",
  USDC: "USDC",
  Native: "NATIVE",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export type EntityId = string & { __brand: "EntityId" };
export type Timestamp = number & { __brand: "Timestamp" };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Metadata = Record<string, unknown>;

export interface Money {
  readonly amount: bigint;
  readonly currency: string;
}
