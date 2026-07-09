"use client";

import { motion } from "framer-motion";
import { Section, Container, Kicker, ChapterNumber } from "@/components/layout";
import { EASE_LUX } from "@/lib/motion";

export default function Chapter01() {
  return (
    <Section
      id="chapter-01"
      height="screen"
      center
      aria-labelledby="chapter-01-title"
    >
      <h1 id="chapter-01-title" className="sr-only">
        Own a fraction. Own the future. Relcko is a blockchain-powered real
        estate tokenization platform.
      </h1>

      <Container className="flex flex-col items-center text-center">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center gap-10" data-parallax="0.35">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: EASE_LUX }}
            className="flex items-center gap-4"
          >
            <ChapterNumber index="01" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker accent>Relcko · The future of property investment</Kicker>
          </motion.div>

          <motion.h2
            aria-hidden
            initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.2, ease: EASE_LUX }}
            className="font-display text-[clamp(2.75rem,7vw,6.5rem)] font-light leading-[0.98] tracking-[-0.035em]"
          >
            <span className="gradient-text">Own a fraction.</span>
            <br />
            <span className="accent-text">Own the future.</span>
          </motion.h2>

          <motion.p
            aria-hidden
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: EASE_LUX }}
            className="max-w-sm text-balance text-sm leading-relaxed text-white/90"
          >
            Own a piece of the world&apos;s most extraordinary buildings.
            Starting at one token.
          </motion.p>

          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.2, ease: EASE_LUX }}
            className="flex flex-col items-center gap-5 pt-6"
          >
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-white/70">
              Scroll to enter
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,255,0.35)]" />
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
