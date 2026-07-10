"use client";

import { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { useAccount, useChainId, useReadContract, useWriteContract } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, STAKING_PLANS, type StakePlan } from "@/lib/staking/config";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";
import { formatWithCommas, timestampToDate, daysToHuman } from "@/lib/blockchain/format";

export default function ActiveStakes() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const stakingContract = getStakingContract(chainId);

  const { data: stakes, refetch } = useReadContract({
    address: stakingContract ?? undefined,
    abi: STAKING_ABI,
    functionName: "getStakesOfUser",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!stakingContract && !!address },
  });

  const { writeContract, isPending } = useWriteContract();

  const handleClaim = useCallback(
    (index: number) => {
      if (!stakingContract) return;
      writeContract({
        address: stakingContract,
        abi: STAKING_ABI,
        functionName: "claim",
        args: [BigInt(index)],
      });
    },
    [stakingContract, writeContract]
  );

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected || !stakes || !Array.isArray(stakes) || stakes.length === 0) return null;

  const stakeList = stakes as Array<{
    amount: bigint;
    totalReturn: bigint;
    planDays: bigint;
    planReturn: bigint;
    stakedOn: bigint;
    maturesOn: bigint;
    claimed: boolean;
    emergencyWithdraw: boolean;
  }>;

  return (
    <Reveal>
      <div className="space-y-3">
        {stakeList.map((s, i) => {
          const amt = Number(s.amount) / 1e18;
          const ret = Number(s.totalReturn) / 1e18;
          const matured = Number(s.maturesOn) < now;
          const plan = STAKING_PLANS.find((p) => p.durationDays === Number(s.planDays));

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: EASE_LUX }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 backdrop-blur-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base text-white/90">
                    {formatWithCommas(amt)} {SALE_META.tokenSymbol}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider ${
                    matured && !s.claimed
                      ? "bg-success/15 text-success"
                      : s.claimed
                        ? "bg-white/5 text-white/30"
                        : "bg-warning/10 text-warning/80"
                  }`}>
                    {s.claimed ? "Claimed" : matured ? "Matured" : "Locked"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white/35">
                  <span>{plan?.label ?? daysToHuman(Number(s.planDays))}</span>
                  <span>Return: {Number(s.planReturn) / 100}%</span>
                  <span>Matures: {timestampToDate(Number(s.maturesOn))}</span>
                </div>
              </div>

              {matured && !s.claimed && (
                <MagneticButton
                  onClick={() => handleClaim(i)}
                  variant="primary"
                  className="!px-4 !py-2 !text-[0.65rem] shrink-0"
                >
                  Claim
                </MagneticButton>
              )}
            </motion.div>
          );
        })}
      </div>
    </Reveal>
  );
}
