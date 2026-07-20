"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import {
  DEFAULT_CHAIN_ID,
  SALE_META,
} from "@/lib/presale/config";
import {
  usePresaleStage,
  useTokenPrice,
  useTotalRaised,
  useTokensRemaining,
} from "@/lib/presale/services/reads";
import {
  PRESALE_START,
  PRESALE_DURATION,
  TOTAL_STAGES,
  formatCountdown,
} from "@/lib/presale/math";
import { compact } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";

const STAGE_LEN = PRESALE_DURATION / TOTAL_STAGES;

function Cell({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-4 py-4 lg:py-5 lg:px-6 xl:px-7">
      <span className="institutional-label text-[0.52rem] sm:text-[0.55rem]">
        {label}
      </span>
      <div className="institutional-figure font-display text-base font-light text-white/90 sm:text-lg xl:text-xl">
        {children}
      </div>
      {!last && (
        <span
          aria-hidden="true"
          className="console-divider-h ml-auto hidden w-[88%] lg:block"
        />
      )}
    </div>
  );
}

export default function InvestmentSummary() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: liveStage } = usePresaleStage(DEFAULT_CHAIN_ID);
  const { data: livePrice } = useTokenPrice(DEFAULT_CHAIN_ID);
  const { data: liveRaised } = useTotalRaised(DEFAULT_CHAIN_ID);
  const { data: liveRemaining } = useTokensRemaining(DEFAULT_CHAIN_ID);

  const stageNum = liveStage !== undefined ? Number(liveStage) : 0;
  const priceNum = livePrice !== undefined ? Number(formatUnits(livePrice as bigint, 18)) : 0;
  const raisedNum = liveRaised !== undefined ? Number(liveRaised) / 1e18 : 0;
  const remainingNum = liveRemaining !== undefined ? Number(liveRemaining) / 1e18 : SALE_META.totalAllocation;

  const supplyMax = SALE_META.totalAllocation;
  const soldPct = supplyMax > 0 ? Math.min(100, (raisedNum / supplyMax) * 100) : 0;

  const presaleConcluded = stageNum >= TOTAL_STAGES;
  const presaleLive = now >= PRESALE_START && !presaleConcluded;

  const nextStageStart = PRESALE_START + (stageNum + 1) * STAGE_LEN;
  const cdText = presaleConcluded
    ? "Concluded"
    : presaleLive
      ? formatCountdown(nextStageStart, now)
      : formatCountdown(PRESALE_START, now);

  const livePctLabel = presaleLive
    ? "Live"
    : presaleConcluded
      ? "Ended"
      : "Upcoming";

  return (
    <motion.div
      className="summary-band rounded-[18px] overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease: EASE_LUX }}
      aria-label="Presale investment summary"
    >
      {/* Live status line */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 lg:px-6 xl:px-7">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            {presaleLive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                presaleLive ? "bg-success" : presaleConcluded ? "bg-white/25" : "bg-warning"
              }`}
            />
          </span>
          <span className="institutional-label text-[0.5rem]">{livePctLabel}</span>
        </div>
        <span className="institutional-figure font-mono text-[0.6rem] text-white/50">
          {cdText}
        </span>
      </div>

      {/* Premium information band — single surface, internal hairlines */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
        <Cell label="Current Stage">
          <span className="text-accent">#{stageNum + 1}</span>
          <span className="institutional-label ml-1 text-[0.5rem] align-middle">
            / {TOTAL_STAGES}
          </span>
        </Cell>
        <Cell label="Current Price">
          {priceNum > 0 ? `$${priceNum.toFixed(4)}` : "—"}
        </Cell>
        <Cell label="Raised">
          {raisedNum > 0 ? `$${compact(raisedNum)}` : "—"}
        </Cell>
        <Cell label="Progress">
          <div className="flex items-center gap-2.5">
            <div
              role="progressbar"
              aria-valuenow={Math.round(soldPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Presale progress"
              className="h-[3px] w-20 overflow-hidden rounded-full bg-white/[0.08]"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue"
                initial={{ width: "0%" }}
                whileInView={{ width: `${soldPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: EASE_LUX }}
              />
            </div>
            <span className="institutional-figure font-mono text-[0.62rem] text-white/55">
              {soldPct.toFixed(1)}%
            </span>
          </div>
        </Cell>
        <Cell label="Next Stage">
          <span className="text-white/70">#{Math.min(stageNum + 2, TOTAL_STAGES)}</span>
        </Cell>
        <Cell label="Remaining" last>
          {remainingNum >= 1_000_000
            ? `${(remainingNum / 1e6).toFixed(1)}M`
            : remainingNum.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
          <span className="institutional-label text-[0.5rem]">{SALE_META.tokenSymbol}</span>
        </Cell>
      </div>
    </motion.div>
  );
}