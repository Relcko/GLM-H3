"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Section, Container, Kicker, ChapterNumber } from "@/components/layout";
import { EASE_LUX, EASE_DIRECTOR, HERO } from "@/lib/motion";
import { getDirector } from "@/lib/director";

/**
 * Hero headline lines — split into words for a per-word cinematic reveal.
 * Each word wipes up from a clipped mask with blur, staggered by HERO.
 */
const HEADLINE_LINES = [
  ["Own", "a", "fraction."],
  ["Own", "the", "future."],
];

export default function Chapter01() {
  // Local content beat, synced from the Director's milestone stage.
  // Starts at 0 on both server and client (no Director read during render)
  // to avoid hydration mismatch; the subscription advances it per stage.
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const d = getDirector();
    // Stage 5: Hero content mounted and curtain ready.
    d.markReady("hero-ready");

    const sync = () => {
      if (d.isStage("scroll-hint")) setBeat(3);
      else if (d.isStage("cta")) setBeat(2);
      else if (d.isStage("headline")) setBeat(1);
    };
    const unsub = d.subscribe(sync);

    // Content beats advance only after the Hero is actually ready, with
    // cinematic timing pulled from HERO constants (never wall-clock literals).
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    if (d.isHeroReady()) {
      t1 = window.setTimeout(() => d.advanceStage(), 200); // headline
      t2 = window.setTimeout(() => d.advanceStage(), 200 + HERO.CTA_DELAY * 1000 + HERO.HEADLINE_DURATION * 1000);
      t3 = window.setTimeout(
        () => d.advanceStage(),
        200 + HERO.CTA_DELAY * 1000 + HERO.HEADLINE_DURATION * 1000 + HERO.SCROLL_HINT_DELAY * 1000 + HERO.CTA_DURATION * 1000
      );
    }

    return () => {
      unsub();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // Per-word stagger index across both lines.
  let wordIndex = 0;

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
          <div
            className="mx-auto flex w-full max-w-5xl flex-col items-center text-center gap-12"
            data-parallax="0.35"
          >
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

          {/* Headline — per-word cinematic reveal (Stage 6) */}
          <h2
            aria-hidden
            className="font-display text-[clamp(2.75rem,7vw,6.75rem)] font-light leading-[0.95] tracking-[-0.045em]"
          >
            {HEADLINE_LINES.map((line, li) => (
              <span key={li} className="block">
                {line.map((word, wi) => {
                  const i = wordIndex++;
                  const revealed = beat >= 1;
                  return (
                    <span
                      key={wi}
                      className="inline-block overflow-hidden align-bottom"
                    >
                      <motion.span
                        className="inline-block"
                        initial={{ y: "110%", opacity: 0, filter: "blur(12px)" }}
                        animate={
                          revealed
                            ? { y: "0%", opacity: 1, filter: "blur(0px)" }
                            : { y: "110%", opacity: 0, filter: "blur(12px)" }
                        }
                        transition={{
                          duration: HERO.HEADLINE_DURATION,
                          delay: i * HERO.HEADLINE_STAGGER,
                          ease: EASE_DIRECTOR,
                        }}
                      >
                        {word}
                        {wi < line.length - 1 ? " " : ""}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </h2>

          <motion.p
            aria-hidden
            initial={{ opacity: 0, y: 12 }}
            animate={beat >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE_LUX }}
            className="max-w-[20rem] text-balance text-sm leading-relaxed text-white/90"
          >
            Own a piece of the world&apos;s most extraordinary buildings.
            Starting at one token.
          </motion.p>

          {/* CTA + Scroll hint (Stages 7 & 8) */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={beat >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: HERO.CTA_DURATION, ease: EASE_DIRECTOR }}
            className="flex flex-col items-center gap-5 pt-6"
          >
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-white/70">
              Scroll to enter
            </span>
            <motion.div
              animate={beat >= 3 ? { y: [0, 8, 0] } : { y: 0 }}
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
