"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { Reveal } from "@/components/Reveal";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, getRlkoToken } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { SALE_META } from "@/lib/presale/config";
import { formatWithCommas } from "@/lib/blockchain/format";

export default function RewardsSummary() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const stakingContract = getStakingContract(chainId);
  const rlkoToken = getRlkoToken(chainId);

  const { data: balance } = useReadContract({
    address: rlkoToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!rlkoToken && !!address },
  });

  const { data: stakes } = useReadContract({
    address: stakingContract ?? undefined,
    abi: STAKING_ABI,
    functionName: "getStakesOfUser",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!stakingContract && !!address },
  });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) return null;

  const balanceNum = balance !== undefined ? Number(balance) / 1e18 : 0;

  let stakedAmount = 0;
  let claimableRewards = 0;
  if (stakes && Array.isArray(stakes)) {
    for (const s of stakes as Array<{ amount: bigint; totalReturn: bigint; claimed: boolean; maturesOn: bigint; emergencyWithdraw: boolean }>) {
      const amt = Number(s.amount) / 1e18;
      const totalRet = Number(s.totalReturn) / 1e18;
      stakedAmount += amt;
      if (!s.claimed && !s.emergencyWithdraw && Number(s.maturesOn) < now) {
        claimableRewards += totalRet - amt;
      }
    }
  }

  const stats = [
    { label: "Available Balance", value: `${formatWithCommas(balanceNum, 2)} ${SALE_META.tokenSymbol}` },
    { label: "Staked Balance", value: `${formatWithCommas(stakedAmount, 2)} ${SALE_META.tokenSymbol}` },
    { label: "Claimable Rewards", value: `${formatWithCommas(claimableRewards, 2)} ${SALE_META.tokenSymbol}` },
  ];

  return (
    <Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 backdrop-blur-sm"
          >
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">
              {s.label}
            </div>
            <div className="mt-1.5 font-display text-lg text-white/90">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
