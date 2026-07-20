import { Currency, type Money, type Timestamp } from "@relcko/types";

/** Decimal places per currency. USDT/USDC use 6 (legacy bug corrected here). */
const CURRENCY_DECIMALS: Readonly<Record<Currency, number>> = {
  [Currency.USDT]: 6,
  [Currency.USDC]: 6,
  [Currency.Native]: 18,
};

export function decimalsFor(currency: Currency): number {
  return CURRENCY_DECIMALS[currency];
}

/** Build Money from a major-unit number (e.g. 12.5 USDT). */
export function money(amount: number | bigint, currency: Currency): Money {
  const decimals = CURRENCY_DECIMALS[currency];
  const factor = 10n ** BigInt(decimals);
  const value =
    typeof amount === "bigint"
      ? amount
      : BigInt(Math.round(Number(amount) * Number(factor)));
  if (value < 0n) throw new RangeError("Money amount must be non-negative");
  return { amount: value, currency };
}

export function moneyFromMinor(amount: bigint, currency: Currency): Money {
  if (amount < 0n) throw new RangeError("Money amount must be non-negative");
  return { amount, currency };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const result = a.amount - b.amount;
  if (result < 0n) throw new RangeError("Subtraction yields negative Money");
  return { amount: result, currency: a.currency };
}

export function multiplyMoney(a: Money, factor: number): Money {
  if (factor < 0) throw new RangeError("Factor must be non-negative");
  return { amount: (a.amount * BigInt(Math.round(factor * 1e9))) / 1_000_000_000n, currency: a.currency };
}

/** Proportionally allocate `total` across `weights`; remainder goes to the largest weight. */
export function allocate(a: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) throw new RangeError("Allocation weights must sum to a positive number");
  const total = a.amount;
  const raw = weights.map((w) => (total * BigInt(Math.round(w * 1e6))) / BigInt(Math.round(sum * 1e6)));
  const distributed = raw.reduce((s, v) => s + v, 0n);
  let remainder = total - distributed;
  const result = raw.map((v) => ({ amount: v, currency: a.currency }));
  let i = 0;
  while (remainder > 0n) {
    result[i % result.length] = { amount: result[i % result.length].amount + 1n, currency: a.currency };
    remainder -= 1n;
    i += 1;
  }
  return result;
}

export function isZero(a: Money): boolean {
  return a.amount === 0n;
}

export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/** Format as a human-readable major-unit string. */
export function formatMoney(a: Money): string {
  const decimals = CURRENCY_DECIMALS[a.currency];
  const negative = a.amount < 0n;
  const abs = negative ? -a.amount : a.amount;
  const major = abs / 10n ** BigInt(decimals);
  const minor = abs % 10n ** BigInt(decimals);
  const minorStr = minor.toString().padStart(decimals, "0").replace(/0+$/, "");
  const majorStr = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${majorStr}${minorStr ? `.${minorStr}` : ""} ${a.currency}`;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function nowIso(): Timestamp {
  return new Date().toISOString();
}

export function toIso(date: Date): Timestamp {
  return date.toISOString();
}

export function fromIso(value: Timestamp): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid ISO timestamp: ${value}`);
  return d;
}
