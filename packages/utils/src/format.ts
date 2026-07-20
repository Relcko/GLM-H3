import type { Address } from "@relcko/types";

/** Shorten an address/entity id for display: 0x1234…abcd. */
export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Lowercase + checksum-insensitive normalize for addresses (display only). */
export function normalizeAddress(address: Address | string): string {
  return address.toLowerCase();
}

/** Format a percentage with fixed precision. */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
