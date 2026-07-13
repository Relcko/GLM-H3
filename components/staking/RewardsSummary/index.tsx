"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { Reveal } from "@/components/Reveal";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, getRlkoToken } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { SALE_META } from "@/lib/presale/config";
import { formatWithCommas } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";

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
    { label: "Available Balance", value: `${formatWithCommas(balanceNum, 2)} ${SALE_META.tokenSymbol}`, accent: false },
    { label: "Staked Balance", value: `${formatWithCommas(stakedAmount, 2)} ${SALE_META.tokenSymbol}`, accent: false },
    { label: "Claimable Rewards", value: `${formatWithCommas(claimableRewards, 2)} ${SALE_META.tokenSymbol}`, accent: claimableRewards > 0 },
  ];

  return (
    <Reveal>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_LUX, delay: i * 0.06 }}
            className="dashboard-card p-5"
          >
            <div className="dashboard-label">{s.label}</div>
            <div className={`mt-1.5 font-display text-lg dashboard-number ${s.accent ? "text-success" : "text-white/90"}`}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>
    </Reveal>
  );
}
