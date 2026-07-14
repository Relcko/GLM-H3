"use client";

import { memo, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useReadContract } from "wagmi";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract } from "@/lib/staking/config";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { useTokenPrice } from "@/lib/presale/services/reads";
import { formatUnits } from "viem";
import { formatWithCommas } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";
import { SkeletonMetric } from "./Skeleton";

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

const RewardsCard = memo(function RewardsCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  const stakingContract = getStakingContract(chainId);

  const { data: stakes, isLoading } = useReadContract({
    address: stakingContract ?? undefined,
    abi: STAKING_ABI,
    functionName: "getStakesOfUser",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!stakingContract && !!address },
  });

  const { data: tokenPrice } = useTokenPrice(DEFAULT_CHAIN_ID);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 10_000);
    return () => clearInterval(id);
  }, []);

  const priceNum = useMemo(
    () => (tokenPrice !== undefined ? Number(formatUnits(tokenPrice as bigint, 18)) : 0),
    [tokenPrice],
  );

  const claimableRewards = useMemo(() => {
    let claimable = 0;
    if (stakes && Array.isArray(stakes)) {
      for (const s of stakes as Array<{
        amount: bigint;
        totalReturn: bigint;
        claimed: boolean;
        maturesOn: bigint;
        emergencyWithdraw: boolean;
      }>) {
        if (!s.claimed && !s.emergencyWithdraw && Number(s.maturesOn) < now) {
          claimable += (Number(s.totalReturn) - Number(s.amount)) / 1e18;
        }
      }
    }
    return claimable;
  }, [stakes, now]);

  const usdValue = claimableRewards * priceNum;

  const [lastUpdated, setLastUpdated] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setLastUpdated(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE_LUX }}
        className="dashboard-card overflow-hidden px-6 py-6 sm:px-7 sm:py-7"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="dashboard-accent-line" />
          <span className="dashboard-label">Claimable Rewards</span>
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
              <path d="M12 2v20M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-white/40">Connect your wallet to see your claimable rewards.</p>
          <button onClick={openConnectModal} className="dashboard-btn dashboard-btn-primary mt-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
            </svg>
            Connect Wallet
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE_LUX }}
    >
      <div className="dashboard-card overflow-hidden px-6 py-6 sm:px-7 sm:py-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="dashboard-accent-line" />
          <span className="dashboard-label">Claimable Rewards</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonMetric />
            <SkeletonMetric />
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-light tracking-tight dashboard-number sm:text-4xl text-success">
                  {formatWithCommas(claimableRewards, 2)}
                </span>
                <span className="font-display text-lg text-white/50">
                  {SALE_META.tokenSymbol}
                </span>
              </div>
              {usdValue > 0 && (
                <div className="text-sm text-white/40">
                  ≈ ${formatWithCommas(usdValue, 2)} USDT
                </div>
              )}
              <p className="max-w-sm text-sm text-white/40 leading-relaxed">
                {claimableRewards > 0
                  ? "Your staking rewards are ready to claim. Visit the staking section to withdraw."
                  : "Stake your RLKO tokens to start earning rewards."}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                onClick={() => {
                  document.getElementById("staking")?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={claimableRewards <= 0}
                className={`group relative flex items-center gap-2.5 rounded-full px-6 py-3 font-display text-sm tracking-wide transition-all duration-[280ms] ease-lux ${
                  claimableRewards > 0
                    ? "bg-success/15 text-success shadow-[0_0_10px_rgba(60,227,125,0.08)] hover:bg-success/20 hover:shadow-[0_0_16px_rgba(60,227,125,0.12)]"
                    : "bg-white/[0.03] text-white/20 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="relative">
                  <path d="M12 2v20M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="relative">
                  {claimableRewards > 0 ? "Claim Rewards" : "No Rewards Available"}
                </span>
              </button>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/20">
                Updated {timeAgo(lastUpdated)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default RewardsCard;
