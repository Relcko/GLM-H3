/** Formatting helpers for the marketplace browsing UI. Local + self-contained. */

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFmt = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFmt.format(value);
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatTokenPrice(value: number): string {
  return `${currencyFmt.format(value)} / fraction`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
