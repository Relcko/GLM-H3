import { CHAIN_IDS } from "@/lib/blockchain/chains";

export const STAKING_CONTRACT: Record<number, `0x${string}`> = {
  [CHAIN_IDS.bsc]: "0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB",
};

export const RLKO_TOKEN: Record<number, `0x${string}`> = {
  [CHAIN_IDS.bsc]: "0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1",
};

export const MIN_STAKE_AMOUNT = 50;

export const TOKEN_DECIMALS = 18;

export interface StakePlan {
  label: string;
  durationDays: number;
  returnPct: number;
  multiplier: string;
}

export const STAKING_PLANS: StakePlan[] = [
  { label: "30 Days", durationDays: 30, returnPct: 5.04, multiplier: "x1.1" },
  { label: "3 Months", durationDays: 90, returnPct: 5.5, multiplier: "x1.2" },
  { label: "6 Months", durationDays: 180, returnPct: 6.88, multiplier: "x1.5" },
  { label: "1 Year", durationDays: 365, returnPct: 9.17, multiplier: "x2" },
  { label: "2 Years", durationDays: 730, returnPct: 13.75, multiplier: "x3" },
  { label: "3 Years", durationDays: 1095, returnPct: 18.34, multiplier: "x4" },
  { label: "4 Years", durationDays: 1460, returnPct: 36.68, multiplier: "x8" },
];

export function getStakingContract(chainId: number): `0x${string}` | null {
  return STAKING_CONTRACT[chainId] ?? null;
}

export function getRlkoToken(chainId: number): `0x${string}` | null {
  return RLKO_TOKEN[chainId] ?? null;
}

export function getPlanByDuration(days: number): StakePlan | undefined {
  return STAKING_PLANS.find((p) => p.durationDays === days);
}
