"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Section, Kicker, ChapterNumber } from "@/components/layout";
import MagneticButton from "@/components/MagneticButton";
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

    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    let scheduled = false;

    // Schedule the content beats (headline -> cta -> scroll-hint) only once
    // the Hero is actually ready. This must run from the subscription, not
    // just at mount: at mount the canvas/world are not ready yet, so the
    // timers would never be armed and the Hero copy would stay hidden.
    const schedule = () => {
      if (scheduled || !d.isHeroReady()) return;
      scheduled = true;
      t1 = window.setTimeout(() => d.advanceStage(), 200); // headline
      t2 = window.setTimeout(
        () => d.advanceStage(),
        200 + HERO.CTA_DELAY * 1000 + HERO.HEADLINE_DURATION * 1000
      );
      t3 = window.setTimeout(
        () => d.advanceStage(),
        200 + HERO.CTA_DELAY * 1000 + HERO.HEADLINE_DURATION * 1000 + HERO.SCROLL_HINT_DELAY * 1000 + HERO.CTA_DURATION * 1000
      );
    };

    const sync = () => {
      if (d.isStage("scroll-hint")) setBeat(3);
      else if (d.isStage("cta")) setBeat(2);
      else if (d.isStage("headline")) setBeat(1);
      schedule();
    };
    const unsub = d.subscribe(sync);
    // Try immediately too (handles reduced-motion, which snaps ready at mount).
    sync();

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
      className="pt-28 sm:pt-32 md:pt-36"
    >
      <h1 id="chapter-01-title" className="sr-only">
        Own a fraction. Own the future. Relcko is a blockchain-powered real
        estate tokenization platform.
      </h1>

      {/* Readability scrim — a soft top-down gradient so the hero copy stays
          legible over the bright building while the structure itself remains
          visible. Lives in the content layer, above the canvas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[48svh] bg-gradient-to-b from-[#050505] via-[#050505]/55 to-transparent"
      />

      <div className="relative w-full max-w-7xl">
        {/* The hero copy sits in a left reading column; the building anchors
            the right/centre of the frame, supporting the text rather than
            competing with it. Negative space on the right keeps the focus on
            the words. */}
        <div
          className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center"
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
            <Kicker>Relcko · The future of property investment</Kicker>
          </motion.div>

          {/* Headline — per-word cinematic reveal (Stage 6). Words keep their
              natural spacing via a right margin so they never merge into one
              blob; each line breaks intentionally. */}
          <h2
            aria-hidden
            className="font-display text-[clamp(2.5rem,6.4vw,5.75rem)] font-light leading-[1.02] tracking-[-0.035em]"
          >
            {HEADLINE_LINES.map((line, li) => (
              <span key={li} className="block">
                {line.map((word, wi) => {
                  const i = wordIndex++;
                  const revealed = beat >= 1;
                  const last = wi === line.length - 1;
                  return (
                    <span
                      key={wi}
                      className="inline-block overflow-hidden align-bottom"
                      style={{
                        marginRight: last ? undefined : "0.26em",
                        paddingBottom: "0.14em",
                      }}
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
            className="max-w-md text-balance text-[0.975rem] leading-relaxed text-white/75"
          >
            Own a piece of the world&apos;s most extraordinary buildings.
            Starting at one token.
          </motion.p>

          {/* Primary CTA — premium, immediately visible below the copy. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: EASE_LUX }}
            className="pt-1"
          >
            <MagneticButton href="#chapter-02" variant="primary">
              Explore the collection
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
              >
                <path
                  d="M2 8h11M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </MagneticButton>
          </motion.div>

          {/* Scroll hint (secondary) */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={beat >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: HERO.CTA_DURATION, ease: EASE_DIRECTOR }}
            className="flex flex-col items-center gap-4 pt-6"
          >
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.4em] text-white/50">
              Scroll to enter
            </span>
            <motion.div
              animate={beat >= 3 ? { y: [0, 8, 0] } : { y: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
