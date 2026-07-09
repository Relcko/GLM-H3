"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Section, Container, Kicker } from "@/components/layout";
import MagneticButton from "@/components/MagneticButton";
import { EASE_LUX } from "@/lib/motion";

export default function Chapter08() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (inView) setRevealed(true);
  }, [inView]);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Section
      id="chapter-08"
      height="tall"
      center
      aria-labelledby="chapter-08-title"
    >
      <Container>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 1, ease: EASE_LUX }}
          className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
        >
          <Kicker>Chapter 08 · The Reveal</Kicker>

          <h2
            id="chapter-08-title"
            className="mt-8 max-w-4xl font-display text-mega font-light text-balance"
          >
            <span className="gradient-text">Become </span>
            <span className="gold-text">an Owner.</span>
          </h2>

          <p className="mt-8 max-w-sm text-balance text-sm leading-relaxed text-white/45">
            The building. The blockchain. The future. One token away from
            yours.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="#top" variant="primary">
              Claim your tokens
              <span className="ml-1">→</span>
            </MagneticButton>
            <MagneticButton href="#faq" variant="ghost">
              Talk to us
            </MagneticButton>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
