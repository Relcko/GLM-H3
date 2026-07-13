"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Section, Kicker } from "@/components/layout";
import MagneticButton from "@/components/MagneticButton";
import Counter from "@/components/Counter";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { formatCountdown, PRESALE_START } from "@/lib/presale/math";
import { useTokenPrice } from "@/lib/presale/services/reads";
import { formatUnits } from "viem";

export default function PresaleHero() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: tokenPrice } = useTokenPrice(DEFAULT_CHAIN_ID);
  const tokenPriceFormatted =
    tokenPrice !== undefined
      ? Number(formatUnits(tokenPrice as bigint, 18))
      : 0;

  const isLive = now >= PRESALE_START;

  const cdText = isLive ? "Live now" : formatCountdown(PRESALE_START, now);

  return (
    <Section
      id="presale-hero"
      height="screen"
      center
      className="pt-28 sm:pt-32 md:pt-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[48svh] bg-gradient-to-b from-[#050505] via-[#050505]/55 to-transparent"
      />

      <div className="relative w-full max-w-7xl">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: EASE_LUX }}
            className="flex items-center gap-4"
          >
            <span className="h-px w-10 bg-white/20" />
            <Kicker accent>RLKO Presale</Kicker>
            <span className="h-px w-10 bg-white/20" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.8, ease: EASE_LUX }}
            className="font-display text-[clamp(3.2rem,7.8vw,6.8rem)] font-light leading-[1.02] tracking-[-0.04em]"
          >
            Token Presale
            <span className="block mt-3 bg-gradient-to-r from-accent via-accent-blue to-accent bg-clip-text text-transparent">
              Is Now Live
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease: EASE_LUX }}
            className="max-w-md text-balance text-[0.975rem] leading-relaxed text-white/60"
          >
            Secure your             {SALE_META.tokenName} tokens at the earliest stage.
            Prices increase with each stage.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5, ease: EASE_LUX }}
            className="flex flex-col items-center gap-6 pt-4"
          >
            <div className="flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.02] px-6 py-2 backdrop-blur-sm">
              <span className="text-xs text-white/40 uppercase tracking-[0.15em]">
                {isLive ? "Status" : "Starts in"}
              </span>
              <span
                className={`font-mono text-sm tabular-nums ${isLive ? "text-success" : "text-white/80"}`}
              >
                {cdText}
              </span>
            </div>

            <div className="flex gap-3">
              <MagneticButton href="#purchase" variant="primary">
                Buy RLKO Tokens
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                  <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
              <MagneticButton href="#tokenomics" variant="ghost">
                View Tokenomics
              </MagneticButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2, ease: EASE_LUX }}
            className="flex items-center gap-8 pt-6"
          >
            <div className="text-center">
              <div className="font-display text-2xl font-light text-white/90">
                {tokenPriceFormatted > 0 ? `$${tokenPriceFormatted.toFixed(4)}` : "—"}
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/35 mt-1">
                Token Price
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <div className="font-display text-2xl font-light text-white/90">
                <Counter to={200_000} prefix="$" />
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/35 mt-1">
                Target Raise
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <div className="font-display text-2xl font-light text-white/90">
                {SALE_META.tokenSymbol}
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/35 mt-1">
                Token
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2.5, ease: EASE_LUX }}
            className="flex flex-col items-center gap-3 pt-4"
          >
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.4em] text-white/35">
              Scroll to participate
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
