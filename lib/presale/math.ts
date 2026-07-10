import { formatCountdown } from "@/lib/blockchain/format";

export const PRESALE_START = Math.floor(
  new Date("2026-06-14T12:00:00Z").getTime() / 1e3
);
export const PRESALE_DURATION = 95 * 24 * 60 * 60;
export const TOTAL_STAGES = 95;
const START_PRICE = 241;
const END_PRICE = 200_000;

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

export function estimateRate(stage = estimateStage()): number {
  if (stage <= 0) return START_PRICE;
  if (stage >= TOTAL_STAGES) return END_PRICE;
  const t = stage / TOTAL_STAGES;
  const n = Math.pow(t, 1.3);
  return START_PRICE + (END_PRICE - START_PRICE) * n;
}

export function estimateTokensForQuote(
  quoteAmount: number,
  stage = estimateStage()
): number {
  const rate = estimateRate(stage);
  if (rate <= 0) return 0;
  return quoteAmount * rate;
}

export { formatCountdown };
