"use client";

import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { SALE_META } from "@/lib/presale/config";

const BENEFITS = [
  {
    title: "Early Access",
    desc: `Be among the first to own ${SALE_META.tokenSymbol} tokens at the lowest possible price. Each subsequent stage increases the rate.`,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Real Estate Backed",
    desc: `${SALE_META.tokenName} tokens represent fractional ownership in tokenized premium real estate SPVs. Each token is secured on-chain.`,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 10l10-7 10 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 16v5h6v-5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    title: "Liquid Ownership",
    desc: "Trade your tokens on decentralized exchanges immediately after the TGE. No lock-up periods, no paperwork.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 16l-4 4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 4v16" stroke="currentColor" strokeWidth="1.2" />
        <path d="M14 4v16" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    title: "Passive Yield",
    desc: "Earn a share of rental income distributed monthly in stablecoin, proportional to your token holdings.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2v20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function PresaleBenefits() {
  return (
    <Section id="benefits" height="auto" center={false} className="py-20">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              Why {SALE_META.tokenSymbol}
            </span>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-display text-[clamp(1.8rem,3.5vw,3rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
            Own the future of<br />
            <span className="bg-gradient-to-r from-accent to-accent-blue bg-clip-text text-transparent">
              real estate
            </span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={0.1 * i}>
              <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                  {b.icon}
                </div>
                <h3 className="font-display text-lg font-light text-white/85">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {b.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
