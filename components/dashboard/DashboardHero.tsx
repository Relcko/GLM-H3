"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_LUX, SPRING } from "@/lib/motion";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import {
  useTokenPrice,
  usePresaleStage,
  useTotalRaised,
  useTokensRemaining,
} from "@/lib/presale/services/reads";
import { formatUnits } from "viem";
import { presaleProgress, PRESALE_START } from "@/lib/presale/math";
import { compact } from "@/lib/blockchain/format";

function MetricTile({
  label,
  value,
  accent = false,
  className = "",
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_LUX, delay }}
      className={`dashboard-glass rounded-xl px-4 py-3 sm:px-5 sm:py-4 ${className}`}
    >
      <div className="dashboard-label">{label}</div>
      <div className={`mt-1 font-display text-lg font-light tracking-tight dashboard-number sm:text-xl ${
        accent ? "text-cyber" : "text-white/90"
      }`}>
        {value}
      </div>
    </motion.div>
  );
}

export default function DashboardHero() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: stage } = usePresaleStage(DEFAULT_CHAIN_ID);
  const { data: price } = useTokenPrice(DEFAULT_CHAIN_ID);
  const { data: remaining } = useTokensRemaining(DEFAULT_CHAIN_ID);
  const { data: raised } = useTotalRaised(DEFAULT_CHAIN_ID);

  const stageDisplay = stage !== undefined ? Number(stage) : 0;
  const priceDisplay = price !== undefined ? Number(formatUnits(price as bigint, 18)) : 0;
  const remainingDisplay = remaining !== undefined ? Number(remaining) / 1e18 : 200_000;
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;

  const progress = raisedDisplay / SALE_META.totalAllocation;
  const isLive = now >= PRESALE_START;

  return (
    <section id="dashboard" className="relative scroll-mt-24">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] via-transparent to-transparent backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.03] via-transparent to-accent-blue/[0.02]" />

        <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE_LUX }}
                className="flex items-center gap-2"
              >
                <span className={`flex h-2 w-2 rounded-full ${isLive ? "bg-success shadow-[0_0_10px_rgba(60,227,125,0.6)] status-dot" : "bg-warning"}`} />
                <span className={`font-mono text-[0.6rem] uppercase tracking-[0.15em] ${isLive ? "text-success" : "text-warning/80"}`}>
                  {isLive ? "Presale Live" : "Coming Soon"}
                </span>
              </motion.div>
              <span className="hidden h-5 w-px bg-white/[0.06] sm:block" />
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE_LUX }}
                className="flex items-center gap-2"
              >
                <span className="dashboard-label">Stage</span>
                <span className="font-mono text-sm tabular-nums text-white/75">#{stageDisplay}</span>
              </motion.div>
            </div>

            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE_LUX }}
              className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.05] px-3 py-1.5 pulse-ring"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
                <path d="M12 2v20M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-accent">
                {SALE_META.tokenSymbol} · ${priceDisplay.toFixed(4)}
              </span>
            </motion.div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Current Price" value={`$${priceDisplay.toFixed(4)}`} accent delay={0.3} />
            <MetricTile
              label="Tokens Remaining"
              value={remainingDisplay >= 1_000_000 ? `${(remainingDisplay / 1e6).toFixed(1)}M` : remainingDisplay.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              delay={0.35}
            />
            <MetricTile label="Total Raised" value={`$${compact(raisedDisplay)}`} delay={0.4} />
            <MetricTile label="Progress" value={`${(progress * 100).toFixed(1)}%`} delay={0.45} />
          </div>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE_LUX }}
            className="mt-5"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="dashboard-label">Fundraising Goal · ${SALE_META.totalAllocation.toLocaleString()}</span>
              <span className="font-mono text-[0.55rem] tabular-nums text-white/40">{Math.min(progress * 100, 100).toFixed(1)}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.min(Math.round(progress * 100), 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue shadow-[0_0_8px_rgba(0,212,255,0.3)]"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                transition={{ duration: 1.5, ease: EASE_LUX }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
