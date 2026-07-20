"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import {
  usePresaleStage,
  useTokenPrice,
  useTotalRaised,
  useTokensRemaining,
  useUserInvestment,
} from "@/lib/presale/services/reads";
import { DEFAULT_CHAIN_ID, SALE_META } from "@/lib/presale/config";
import { useAccount } from "@/lib/blockchain/wallet";
import { formatUnits } from "viem";
import { compact } from "@/lib/blockchain/format";
import { SkeletonMetric } from "./Skeleton";

function StatRow({ label, value, accent = false, delay = 0 }: { label: string; value: string; accent?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: EASE_LUX, delay }}
      className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-b-0 last:pb-0"
    >
      <span className="dashboard-label">{label}</span>
      <span className={`font-display text-sm tracking-tight dashboard-number ${accent ? "text-cyber" : "text-white/80"}`}>{value}</span>
    </motion.div>
  );
}

const InvestorStats = memo(function InvestorStats() {
  const { address, isConnected } = useAccount();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 10000);
    return () => clearInterval(id);
  }, []);

  const { data: stage, isLoading: stageLoading } = usePresaleStage(DEFAULT_CHAIN_ID);
  const { data: price, isLoading: priceLoading } = useTokenPrice(DEFAULT_CHAIN_ID);
  const { data: raised, isLoading: raisedLoading } = useTotalRaised(DEFAULT_CHAIN_ID);
  const { data: remaining, isLoading: remainingLoading } = useTokensRemaining(DEFAULT_CHAIN_ID);
  const { data: userInvestment } = useUserInvestment(DEFAULT_CHAIN_ID, address);

  const isLoading = stageLoading || priceLoading || raisedLoading || remainingLoading;

  const stageDisplay = stage !== undefined ? Number(stage) : 0;
  const priceDisplay = price !== undefined ? Number(formatUnits(price as bigint, 18)) : 0;
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;
  const remainingDisplay = remaining !== undefined ? Number(remaining) / 1e18 : 200_000;
  const investmentDisplay = userInvestment !== undefined ? Number(formatUnits(userInvestment as bigint, 18)) : 0;

  const progress = SALE_META.totalAllocation > 0 ? raisedDisplay / SALE_META.totalAllocation : 0;
  const totalStages = 95;
  const stagesRemaining = Math.max(0, totalStages - stageDisplay);
  const investors = Math.floor(raisedDisplay / 50) + 18;

  if (isLoading) {
    return (
      <div className="dashboard-glass p-5">
        <div className="space-y-3">
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_LUX }}
      className="dashboard-glass"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Investor Statistics</span>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-wider text-accent flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: EASE_LUX }}
            />
            Live
          </span>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="dashboard-label">Presale Progress</span>
            <span className="font-mono text-[0.55rem] tabular-nums text-white/40">{Math.min(progress * 100, 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue shadow-[0_0_4px_rgba(71,194,255,0.15)]"
              initial={{ width: "0%" }}
              whileInView={{ width: `${Math.min(progress * 100, 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: EASE_LUX }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <StatRow label="Current Stage" value={`#${stageDisplay} of ${totalStages}`} accent delay={0.05} />
          <StatRow label="Stages Remaining" value={`${stagesRemaining}`} delay={0.1} />
          <StatRow label="Token Price" value={`$${priceDisplay.toFixed(4)}`} accent delay={0.15} />
          <StatRow label="Total Raised" value={`$${compact(raisedDisplay)}`} delay={0.2} />
          <StatRow label="Tokens Remaining" value={remainingDisplay >= 1e6 ? `${(remainingDisplay / 1e6).toFixed(1)}M` : remainingDisplay.toLocaleString("en-US", { maximumFractionDigits: 0 })} delay={0.25} />
          <StatRow label="Est. Investors" value={`${investors}+`} delay={0.3} />
          {isConnected && (
            <StatRow label="Your Investment" value={`$${investmentDisplay.toFixed(2)}`} accent delay={0.35} />
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default InvestorStats;

