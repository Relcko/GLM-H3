"use client";

import { motion } from "framer-motion";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { SALE_META } from "@/lib/presale/config";

const ALLOCATIONS = [
  { label: "Presale", pct: 20, color: "bg-accent" },
  { label: "Liquidity Pool", pct: 25, color: "bg-accent-blue" },
  { label: "Ecosystem & Rewards", pct: 20, color: "bg-[#D6B25E]" },
  { label: "Team & Advisors", pct: 15, color: "bg-white/40" },
  { label: "Marketing", pct: 10, color: "bg-white/25" },
  { label: "Reserve", pct: 10, color: "bg-white/15" },
];

const TOTAL_SUPPLY = 1_000_000_000;

export default function PresaleTokenomics() {
  return (
    <Section id="tokenomics" height="auto" center={false} className="py-20">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              Tokenomics
            </span>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-display text-[clamp(1.8rem,3.5vw,3rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
            {SALE_META.tokenSymbol} distribution
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-4">
              {ALLOCATIONS.map((a, i) => (
                <div key={a.label} className="group">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${a.color}`} />
                      <span className="text-sm text-white/70">{a.label}</span>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-white/50">
                      {a.pct}% · {((TOTAL_SUPPLY * a.pct) / 100).toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full ${a.color}`}
                      initial={{ width: "0%" }}
                      whileInView={{ width: `${a.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-8">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <h4 className="font-display text-lg font-light text-white/80">
                Presale Allocation
              </h4>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-sm text-white/50">Total Supply</span>
                  <span className="font-mono text-sm text-white/80">
                    {TOTAL_SUPPLY.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-sm text-white/50">Presale Allocation</span>
                  <span className="font-mono text-sm text-white/80">
                    {(TOTAL_SUPPLY * 0.2).toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Fundraising Target</span>
                  <span className="font-mono text-sm text-accent">
                    ${SALE_META.totalAllocation.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
