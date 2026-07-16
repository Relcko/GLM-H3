import { decimalsFor } from "@relcko/utils";
import { Currency } from "@relcko/types";
import type { Money } from "@relcko/types";

/** Convert a Money value to its major-unit (display) number. */
export function majorUnits(money: Money): number {
  const decimals = decimalsFor(money.currency);
  return Number(money.amount) / 10 ** decimals;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USDT: "$",
  USDC: "$",
  EUR: "€",
  GBP: "£",
};

function symbolFor(currency: Currency): string {
  return CURRENCY_SYMBOL[currency] ?? "";
}

/** Format a Money value as a localized major-unit string. */
export function formatMoney(money: Money, fractionalDigits = 0): string {
  const value = majorUnits(money);
  const symbol = symbolFor(money.currency);
  const body = value.toLocaleString("en-US", {
    minimumFractionDigits: fractionalDigits,
    maximumFractionDigits: fractionalDigits,
  });
  return `${symbol}${body}`;
}

/** Format a plain major-unit number with a currency code suffix. */
export function formatAmount(value: number, currency: Currency, fractionalDigits = 0): string {
  const symbol = symbolFor(currency);
  const body = value.toLocaleString("en-US", {
    minimumFractionDigits: fractionalDigits,
    maximumFractionDigits: fractionalDigits,
  });
  return `${symbol}${body} ${currency}`;
}

/** Format a percentage with a fixed number of fraction digits. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Format a bigint token count with thousands separators. */
export function formatTokens(value: bigint): string {
  return value.toLocaleString("en-US");
}

/** Compact formatting for large numbers (e.g. 1.2M). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Format an ISO date as a short, human-readable label. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Format an ISO timestamp with time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Derive { city, region, country } from a "City, Region, Country" location string. */
export function parseLocation(location: string): { city: string; region: string; country: string } {
  const parts = location.split(",").map((p) => p.trim());
  const [city = "", region = "", country = ""] = parts;
  return { city, region, country };
}
