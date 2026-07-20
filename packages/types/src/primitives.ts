import type { AmountInCents } from './index';

export interface Money {
  readonly amount: AmountInCents;
  readonly currency: string;
}

export interface Percentage {
  readonly value: number;
}

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

export interface PaginationParams {
  readonly offset: number;
  readonly limit: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface Versioned {
  readonly version: number;
}

export interface Auditable {
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;
}

export interface StatusValue<T extends string> {
  readonly status: T;
}

export function centsToNumber(cents: AmountInCents): number {
  return cents / 100;
}

export function numberToCents(value: number): AmountInCents {
  return Math.round(value * 100) as AmountInCents;
}
