"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Section } from "@/components/layout";
import Counter from "@/components/Counter";
import { EASE_LUX, HERO, DUR } from "@/lib/motion";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { formatCountdown, PRESALE_START } from "@/lib/presale/math";
import {
  useTokenPrice,
  usePresaleStage,
  useTotalRaised,
} from "@/lib/presale/services/reads";
import { formatUnits } from "viem";
import { compact } from "@/lib/blockchain/format";

/* ── Local animation variants ────────────────────────────────── */

const wordRise = {
  hidden: { opacity: 0, y: "110%" },
  show: { opacity: 1, y: "0%" },
} as const;

const fadeUpSerif = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DUR.slow, ease: EASE_LUX },
  },
} as const;

const fade = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: DUR.slow, ease: EASE_LUX },
  },
} as const;

/* ── Headline words ───────────────────────────────────────────── */

const LINE_1 = ["Own", "the", "future", "of"];
const LINE_2 = ["real", "estate."];

const line1Stagger = HERO.HEADLINE_STAGGER;
const line1Duration = HERO.HEADLINE_DURATION;
const line2Delay = line1Stagger * LINE_1.length + 0.1;
const line2Stagger = HERO.HEADLINE_STAGGER;
const line2Duration = HERO.HEADLINE_DURATION;

/* ── Stats timing ─────────────────────────────────────────────── */

const statsDelay = line2Delay + line2Stagger * LINE_2.length + HERO.CTA_DELAY;

/* ── Stat tile ────────────────────────────────────────────────── */

function StatTile({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_LUX, delay }}
      className="flex flex-col items-center gap-1 px-6 py-2"
    >
      <span className="font-display text-xl font-light text-white/90 sm:text-2xl">
        {children}
      </span>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/30">
        {label}
      </span>
    </motion.div>
  );
}

/* ── Component ────────────────────────────────────────────────── */

export default function PresaleHero() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: price } = useTokenPrice(DEFAULT_CHAIN_ID);
  const { data: stage } = usePresaleStage(DEFAULT_CHAIN_ID);
  const { data: raised } = useTotalRaised(DEFAULT_CHAIN_ID);

  const priceDisplay =
    price !== undefined ? Number(formatUnits(price as bigint, 18)) : 0;
  const stageDisplay = stage !== undefined ? Number(stage) : 0;
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;

  const isLive = now >= PRESALE_START;
  const cdText = isLive ? "Live now" : formatCountdown(PRESALE_START, now);

  return (
    <Section
      id="presale-hero"
      height="auto"
      center
      className="min-h-[80svh] pt-24 sm:pt-28 md:pt-32"
    >
      {/* ── Background compatible with cinematic engine ── */}
      {/* Top fade for navbar seamlessness */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[50svh] bg-gradient-to-b from-[#0E0F13] via-[#0E0F13]/60 to-transparent"
      />
      {/* Soft radial accent glow (top-right) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-[10svh] h-[45svh] w-[45svh] rounded-full bg-accent/[0.05] blur-[120px]"
      />
      {/* Soft gold glow (bottom-left) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 bottom-[4svh] h-[35svh] w-[35svh] rounded-full bg-gold/[0.04] blur-[100px]"
      />

      {/* ── Content ── */}
      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-7 text-center sm:gap-9">
        {/* Kicker with flanking lines */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE_LUX }}
          className="flex items-center gap-4"
        >
          <span className="h-px w-8 bg-gold/30 sm:w-12" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.4em] text-gold/60 sm:text-[0.62rem]">
            RLKO Presale
          </span>
          <span className="h-px w-8 bg-gold/30 sm:w-12" />
        </motion.div>

        {/* Headline — line 1 */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[1.04] tracking-[-0.035em]">
          <span aria-hidden="true" className="block">
            {LINE_1.map((word, i) => (
              <span
                key={i}
                className="inline-block overflow-hidden align-bottom pb-[0.06em]"
              >
                <motion.span
                  className="inline-block text-white"
                  variants={wordRise}
                  initial="hidden"
                  animate="show"
                  transition={{
                    duration: line1Duration,
                    ease: EASE_LUX,
                    delay: 0.7 + i * line1Stagger,
                  }}
                >
                  {word}
                  {i < LINE_1.length - 1 ? "\u00A0" : ""}
                </motion.span>
              </span>
            ))}
          </span>
          {/* Headline — line 2 */}
          <span aria-hidden="true" className="block">
            {LINE_2.map((word, i) => (
              <span
                key={i}
                className="inline-block overflow-hidden align-bottom pb-[0.06em]"
              >
                <motion.span
                  className="inline-block bg-gradient-to-r from-accent via-accent-blue to-accent bg-clip-text text-transparent"
                  variants={wordRise}
                  initial="hidden"
                  animate="show"
                  transition={{
                    duration: line2Duration,
                    ease: EASE_LUX,
                    delay: line2Delay + i * line2Stagger,
                  }}
                >
                  {word}
                  {i < LINE_2.length - 1 ? "\u00A0" : ""}
                </motion.span>
              </span>
            ))}
          </span>
          <span className="sr-only">
            Own the future of real estate.
          </span>
        </h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUpSerif}
          initial="hidden"
          animate="show"
          transition={{ duration: DUR.slow, ease: EASE_LUX, delay: line2Delay + line2Stagger * LINE_2.length + 0.1 }}
          className="max-w-lg text-balance text-[0.95rem] font-light leading-relaxed text-white/50 sm:text-[1.05rem]"
        >
          Invest in premium real-world assets through blockchain-powered
          fractional ownership. Secure, transparent, and accessible from
          anywhere.
        </motion.p>

        {/* Live presale badge + stats */}
        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.8, ease: EASE_LUX, delay: statsDelay }}
          className="mt-2 flex flex-col items-center gap-5 sm:gap-6"
        >
          {/* Live status pill (glassmorphism) */}
          <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isLive ? "bg-success" : "bg-warning"
                }`}
              />
            </span>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/30">
              {isLive ? "Presale Live" : "Launches In"}
            </span>
            <span className="font-mono text-xs tabular-nums text-white/90">
              {isLive ? `Stage ${stageDisplay + 1}` : cdText}
            </span>
          </div>

          {/* Stats row (divided glass tiles) */}
          <div className="flex flex-wrap items-center justify-center gap-y-4">
            <StatTile label="Token Price" delay={statsDelay + 0.1}>
              {priceDisplay > 0 ? `$${priceDisplay.toFixed(4)}` : "—"}
            </StatTile>
            <div className="h-8 w-px bg-white/[0.08]" />
            <StatTile label="Raised" delay={statsDelay + 0.15}>
              <Counter
                to={raisedDisplay || 0}
                prefix="$"
                duration={1800}
              />
            </StatTile>
            <div className="h-8 w-px bg-white/[0.08]" />
            <StatTile label="Target" delay={statsDelay + 0.2}>
              {compact(SALE_META.totalAllocation)}
            </StatTile>
            <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />
            <div className="hidden sm:block">
              <StatTile label="Token" delay={statsDelay + 0.25}>
                {SALE_META.tokenSymbol}
              </StatTile>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: HERO.SCROLL_HINT_DURATION,
            ease: EASE_LUX,
            delay: statsDelay + 0.4 + HERO.SCROLL_HINT_DELAY,
          }}
          className="flex flex-col items-center gap-2.5 pt-4"
        >
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-white/20">
            Scroll to invest
          </span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-9 w-5 items-start justify-center rounded-full border border-white/[0.1] p-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}