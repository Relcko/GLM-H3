import { STAKING_PLANS } from "./config";
import type { StakeInfo } from "./types";

export function calculateTotalReturn(amount: number, returnPct: number): number {
  return amount + (amount * returnPct) / 100;
}

export function calculateReward(amount: number, returnPct: number): number {
  return (amount * returnPct) / 100;
}

export function findPlanByDuration(days: number) {
  return STAKING_PLANS.find((p) => p.durationDays === days);
}

export function getPlanReturnPct(days: number): number {
  const plan = findPlanByDuration(days);
  return plan?.returnPct ?? 0;
}

export function parseStakeInfo(info: StakeInfo) {
  return {
    user: info.user,
    amount: Number(info.amount) / 1e18,
    totalReturn: Number(info.totalReturn) / 1e18,
    planDays: Number(info.planDays),
    planReturn: Number(info.planReturn) / 100,
    stakedOn: Number(info.stakedOn),
    maturesOn: Number(info.maturesOn),
    claimed: info.claimed,
    emergencyWithdraw: info.emergencyWithdraw,
  };
}

export function isStakeMatured(maturesOn: number): boolean {
  return Math.floor(Date.now() / 1e3) > maturesOn;
}

export function isStakeClaimable(info: StakeInfo): boolean {
  const { maturesOn, claimed, emergencyWithdraw } = parseStakeInfo(info);
  return !claimed && !emergencyWithdraw && isStakeMatured(maturesOn);
}
