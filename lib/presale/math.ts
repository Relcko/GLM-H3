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

/** Fallback token price (USDT per RLKO, 18-decimals) used when on-chain data is not yet available. */
const FALLBACK_TOKEN_PRICE = 1150000000000000000n; // 1.15 USDT

/** Optimistic rate estimate: tokens received per 1 unit of quote currency. */
export function estimateRate(now?: number): number {
  return 1e18 / Number(FALLBACK_TOKEN_PRICE);
}

/** Optimistic token estimate: tokens received for a given payment amount. */
export function estimateTokensForQuote(amount: number, now?: number): number {
  return (amount * 1e18) / Number(FALLBACK_TOKEN_PRICE);
}
