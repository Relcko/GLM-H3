"use client";

import { motion } from "framer-motion";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { useTotalRaised, usePresaleStage, useTokensRemaining, useTokenPrice } from "@/lib/presale/services/reads";
import { DEFAULT_CHAIN_ID, SALE_META } from "@/lib/presale/config";
import { estimateStage } from "@/lib/presale/math";
import { compact, formatTokenAmount } from "@/lib/blockchain/format";

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className={`font-display text-3xl font-light tracking-tight ${accent ? "text-accent" : "text-white/90"}`}>
        {value}
      </div>
      <div className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
    </div>
  );
}

export default function PresaleStats() {
  const chainId = DEFAULT_CHAIN_ID;
  const { data: stage } = usePresaleStage(chainId);
  const { data: price } = useTokenPrice(chainId);
  const { data: remaining } = useTokensRemaining(chainId);
  const { data: raised } = useTotalRaised(chainId);

  const stageDisplay = stage !== undefined ? Number(stage) : estimateStage();
  const priceDisplay = price !== undefined ? Number(price) / 1e18 : 0.005;
  const remainingDisplay = remaining !== undefined ? Number(remaining) / 1e18 : 200_000;
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;
  const progressPct = (raisedDisplay / SALE_META.totalAllocation) * 100;

  return (
    <Section id="presale-stats" height="auto" center={false} className="py-20">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              Live Metrics
            </span>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Reveal delay={0.1}>
            <StatCard label="Current Stage" value={`#${stageDisplay}`} accent />
          </Reveal>
          <Reveal delay={0.2}>
            <StatCard
              label="Token Price"
              value={`$${priceDisplay.toFixed(4)}`}
              accent
            />
          </Reveal>
          <Reveal delay={0.3}>
            <StatCard
              label="Tokens Remaining"
              value={formatTokenAmount(remainingDisplay)}
            />
          </Reveal>
          <Reveal delay={0.4}>
            <StatCard
              label="Total Raised"
              value={`$${compact(raisedDisplay)}`}
            />
          </Reveal>
        </div>

        <Reveal delay={0.5}>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/35">
                Progress
              </span>
              <span className="font-mono text-[0.6rem] tabular-nums text-white/50">
                {progressPct.toFixed(1)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue"
                initial={{ width: "0%" }}
                whileInView={{ width: `${Math.min(progressPct, 100)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
