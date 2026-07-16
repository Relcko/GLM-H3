export type Locale = "en-US" | "en-GB" | "fr" | "de" | "es" | "ja" | "zh";

export const DEFAULT_LOCALE: Locale = "en-US";

export const SUPPORTED_LOCALES: Locale[] = ["en-US", "en-GB"];

export const CURRENCY_MAP: Record<string, string> = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  JPY: "JPY",
  USDT: "USD",
  USDC: "USD",
};

export function getCurrencyLocale(currency: string): string {
  return CURRENCY_MAP[currency] || currency;
}
