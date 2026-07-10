export interface StakeInfo {
  user: `0x${string}`;
  amount: bigint;
  totalReturn: bigint;
  planDays: bigint;
  planReturn: bigint;
  stakedOn: bigint;
  maturesOn: bigint;
  claimed: boolean;
  emergencyWithdraw: boolean;
}
