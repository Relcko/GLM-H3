export { formatCountdown } from "@/lib/blockchain/format";

export const PRESALE_START = Math.floor(
  new Date("2026-06-14T12:00:00Z").getTime() / 1e3
);
export const PRESALE_DURATION = 95 * 24 * 60 * 60;
export const TOTAL_STAGES = 95;

export function elapsedSeconds(now = Math.floor(Date.now() / 1e3)): number {
  return Math.max(0, now - PRESALE_START);
}

export function presaleProgress(now = Math.floor(Date.now() / 1e3)): number {
  return Math.min(1, Math.max(0, elapsedSeconds(now) / PRESALE_DURATION));
}

export function estimateStage(now = Math.floor(Date.now() / 1e3)): number {
  if (now < PRESALE_START) return 0;
  const t = elapsedSeconds(now);
  if (t >= PRESALE_DURATION) return TOTAL_STAGES;
  return Math.min(TOTAL_STAGES, Math.floor(presaleProgress(now) * TOTAL_STAGES));
}

/**
 * ── FALLBACK ORACLE PRICES ───────────────────────────────────────
 * Used ONLY while the on-chain preview (previewPurchase) is loading.
 * These are optimistic placeholders, NOT the source of truth.
 *
 * The on-chain contract computes:
 *   native → USDT via Chainlink BNB/USD feed (8 decimals)
 *   USDT → RLKO via active stage tokenPrice (18 decimals)
 *   final = (nativeAmount * bnbUsd * 1e10) / tokenPrice
 */

/** Fallback BNB/USD price (8 decimals, Chainlink format). ~580 USDT/BNB. */
const FALLBACK_BNB_USD = 58_000_000_000n; // 580e8

/** Fallback token price (USDT per RLKO, 18 decimals). */
const FALLBACK_TOKEN_PRICE = 1_150_000_000_000_000_000n; // 1.15 USDT

/**
 * Optimistic rate estimate: tokens received per 1 native token.
 * Formula: (1 native * BNB_USD * 1e10) / tokenPrice  (mirrors _nativeToUsdt × _calculateTokenAmount).
 */
export function estimateRate(now?: number): number {
  return Number(FALLBACK_BNB_USD * 10_000_000_000n) / Number(FALLBACK_TOKEN_PRICE);
}

/**
 * Optimistic token estimate: tokens received for a given native payment amount.
 * Formula: (amount * BNB_USD * 1e10) / tokenPrice
 */
export function estimateTokensForQuote(amount: number, now?: number): number {
  return (amount * Number(FALLBACK_BNB_USD * 10_000_000_000n)) / Number(FALLBACK_TOKEN_PRICE);
}
