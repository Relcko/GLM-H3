"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, getRlkoToken } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { SALE_META } from "@/lib/presale/config";
import { formatWithCommas } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";

export default function PortfolioSummary() {
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
  let totalValue = 0;

  if (stakes && Array.isArray(stakes)) {
    for (const s of stakes as Array<{ amount: bigint; totalReturn: bigint; claimed: boolean; maturesOn: bigint; emergencyWithdraw: boolean }>) {
      const amt = Number(s.amount) / 1e18;
      const totalRet = Number(s.totalReturn) / 1e18;
      stakedAmount += amt;
      totalValue += totalRet;
      if (!s.claimed && !s.emergencyWithdraw && Number(s.maturesOn) < now) {
        claimableRewards += totalRet - amt;
      }
    }
  }

  totalValue += balanceNum;

  const metrics = [
    {
      label: "Wallet Balance",
      value: `${formatWithCommas(balanceNum, 2)} ${SALE_META.tokenSymbol}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: "Staked",
      value: `${formatWithCommas(stakedAmount, 2)} ${SALE_META.tokenSymbol}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M12 10v6M9 13h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Claimable Rewards",
      value: `${formatWithCommas(claimableRewards, 2)} ${SALE_META.tokenSymbol}`,
      highlight: claimableRewards > 0,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2v20M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Portfolio Value",
      value: `${formatWithCommas(totalValue, 2)} ${SALE_META.tokenSymbol}`,
      accent: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 12h3l2-5 3 9 3-7 2 3h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_LUX, delay: i * 0.08 }}
          className="dashboard-card group overflow-hidden p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
              m.highlight ? "bg-success/15 text-success" : m.accent ? "bg-accent/10 text-accent" : "bg-white/[0.04] text-white/40"
            }`}>
              {m.icon}
            </div>
            {m.highlight && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-success">
                Ready
              </span>
            )}
          </div>
          <div className={`dashboard-label ${m.highlight ? "!text-success/60" : ""}`}>
            {m.label}
          </div>
          <div className={`mt-1 font-display text-base dashboard-number ${
            m.accent ? "text-cyber" : m.highlight ? "text-success" : "text-white/85"
          }`}>
            {m.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
