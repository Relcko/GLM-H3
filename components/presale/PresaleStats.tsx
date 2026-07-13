"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { useTotalRaised, usePresaleStage, useTokensRemaining, useTokenPrice } from "@/lib/presale/services/reads";
import { DEFAULT_CHAIN_ID, SALE_META } from "@/lib/presale/config";
import { compact, formatTokenAmount } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";

const StatCard = memo(function StatCard({ label, value, accent = false, delay = 0 }: { label: string; value: string; accent?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE_LUX, delay }}
      className="dashboard-card overflow-hidden p-6 sm:p-8"
    >
      <div className={`font-display text-3xl font-light tracking-tight dashboard-number ${accent ? "text-cyber" : "text-white/90"}`}>
        {value}
      </div>
      <div className="mt-2 dashboard-label">{label}</div>
    </motion.div>
  );
});

export default function PresaleStats() {
  const chainId = DEFAULT_CHAIN_ID;
  const { data: stage } = usePresaleStage(chainId);
  const { data: price } = useTokenPrice(chainId);
  const { data: remaining } = useTokensRemaining(chainId);
  const { data: raised } = useTotalRaised(chainId);

  const stageDisplay = stage !== undefined ? Number(stage) : 0;
  const priceDisplay = price !== undefined ? Number(price) / 1e18 : 0.005;
  const remainingDisplay = remaining !== undefined ? Number(remaining) / 1e18 : 200_000;
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;
  const progressPct = (raisedDisplay / SALE_META.totalAllocation) * 100;

  return (
    <Section id="presale-stats" height="auto" center={false} className="py-20">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Live Metrics</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Current Stage" value={`#${stageDisplay}`} accent delay={0.1} />
          <StatCard label="Token Price" value={`$${priceDisplay.toFixed(4)}`} accent delay={0.18} />
          <StatCard label="Tokens Remaining" value={formatTokenAmount(remainingDisplay)} delay={0.26} />
          <StatCard label="Total Raised" value={`$${compact(raisedDisplay)}`} delay={0.34} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_LUX, delay: 0.4 }}
          className="mt-8"
        >
          <div className="dashboard-card overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between mb-2">
              <span className="dashboard-label">Progress</span>
              <span className="font-mono text-[0.6rem] tabular-nums text-white/50">
                {progressPct.toFixed(1)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue shadow-[0_0_8px_rgba(0,212,255,0.2)]"
                initial={{ width: "0%" }}
                whileInView={{ width: `${Math.min(progressPct, 100)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: EASE_LUX }}
              />
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
