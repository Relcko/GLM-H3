"use client";

import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { motion } from "framer-motion";
import { EASE_LUX, DUR, stagger } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";

/* ── Card data ───────────────────────────────────────────────── */

const BENEFITS = [
  {
    title: "Fractional Ownership",
    desc: "Own premium real estate with significantly lower capital requirements while maintaining exposure to institutional-quality assets.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 21V8l8-5 8 5v13" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M4 12h16" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    title: "Passive Rewards",
    desc: "Generate long-term value through staking rewards designed to encourage sustainable ecosystem participation.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M6 19V11l4 2 4-5v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Real Asset Backing",
    desc: "Every ecosystem is designed around tangible real-world assets rather than speculative utility alone.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 4v5c0 4.4-3.6 8-8 9-4.4-1-8-4.6-8-9V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Global Marketplace",
    desc: "Access tokenized investment opportunities from anywhere through a transparent blockchain infrastructure.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    title: "Community Governance",
    desc: "Participate in shaping the future direction of the Relcko ecosystem through governance mechanisms.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="19" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="12" cy="18" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 6.5h10M6 8l5 8M18 8l-5 8" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    title: "NFT Ecosystem",
    desc: "Unlock additional utilities through NFT integrations that complement ownership and platform participation.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M12 3v18M4 7.5l8 4.5 8-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

/* ── Card ────────────────────────────────────────────────────── */

const cardVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DUR.slow, ease: EASE_LUX },
  },
} as const;

function BenefitCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: EASE_LUX }}
      className="group relative flex h-full flex-col rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-7 backdrop-blur-sm transition-colors duration-500 hover:border-accent/20 sm:p-8"
    >
      {/* Soft Reflection — top edge highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
      />
      {/* Glow on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(0,212,255,0.05), transparent 60%)",
        }}
      />

      {/* Icon */}
      <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-accent/[0.06] text-accent transition-colors duration-500 group-hover:border-accent/30 group-hover:bg-accent/10">
        {icon}
      </div>

      {/* Title */}
      <h3 className="relative font-display text-lg font-light tracking-tight text-white/90">
        {title}
      </h3>

      {/* Description */}
      <p className="relative mt-2.5 text-sm leading-relaxed text-white/45">
        {desc}
      </p>
    </motion.div>
  );
}

/* ── Section ──────────────────────────────────────────────────── */

export default function PresaleBenefits() {
  return (
    <Section id="benefits" height="auto" center={false} className="py-16 sm:py-20 lg:py-8 lg:pt-16">
      <Container>
        {/* Eyebrow */}
        <Reveal>
          <div className="mb-3 flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.42em] text-accent/70">
              Why {SALE_META.tokenSymbol}
            </span>
          </div>
        </Reveal>

        {/* Headline */}
        <Reveal>
          <h2 className="max-w-2xl font-display text-[clamp(1.85rem,4vw,3.25rem)] font-light leading-[1.08] tracking-[-0.032em] text-white/90">
            Built for the next generation
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-blue to-accent bg-clip-text text-transparent">
              of real estate investing.
            </span>
          </h2>
        </Reveal>

        {/* Subheadline */}
        <Reveal delay={0.06}>
          <p className="mt-5 max-w-xl text-balance text-[0.95rem] font-light leading-relaxed text-white/45">
            {SALE_META.tokenName} combines blockchain transparency with premium
            real-world assets, enabling investors worldwide to access
            institutional-quality opportunities through fractional ownership.
          </p>
        </Reveal>

        {/* Card grid — 3 columns desktop, 2 tablet, 1 mobile */}
        <motion.div
          variants={stagger(0.09, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-8% 0px" }}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6"
        >
          {BENEFITS.map((b) => (
            <BenefitCard
              key={b.title}
              title={b.title}
              desc={b.desc}
              icon={b.icon}
            />
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}