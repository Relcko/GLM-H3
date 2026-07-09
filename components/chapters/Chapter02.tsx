"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Section, Container, ContentColumn, Kicker, ChapterNumber } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { EASE_LUX } from "@/lib/motion";

const MATERIALS = [
  { k: "Glass", w: "01", v: "Low-iron Diamant glazing, 99.5% clarity" },
  { k: "Concrete", w: "02", v: "Hand-finished microcement, polished by artisans" },
  { k: "Steel", w: "03", v: "Brushed grade-316 stainless, marine-grade" },
  { k: "Finishes", w: "04", v: "Italian travertine, walnut, brushed bronze" },
];

export default function Chapter02() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-12% 0px" });
  const [cardsRevealed, setCardsRevealed] = useState(false);

  useEffect(() => { if (cardsInView) setCardsRevealed(true); }, [cardsInView]);
  useEffect(() => { const t = setTimeout(() => setCardsRevealed(true), 4000); return () => clearTimeout(t); }, []);

  return (
    <Section
      id="chapter-02"
      height="tall"
      center
      aria-labelledby="chapter-02-title"
    >
      <Container>
        <ContentColumn side="left" width="reading">
          <Reveal className="flex items-center gap-4">
            <ChapterNumber index="02" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Architecture</Kicker>
          </Reveal>

          <h2
            id="chapter-02-title"
            className="font-display text-chapter font-light gradient-text text-balance"
          >
            Crafted to the millimetre.
          </h2>

          <Reveal className="max-w-sm text-balance text-sm leading-relaxed text-white/50">
            Every surface, every joint, every shadow — deliberate. Materials
            chosen once. Refinement that compounds for decades.
          </Reveal>

          <div ref={cardsRef} className="grid w-full grid-cols-2 gap-4">
            {MATERIALS.map((m, i) => (
              <motion.div
                key={m.k}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={cardsRevealed ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 24, filter: "blur(8px)" }}
                transition={{
                  duration: 0.8,
                  ease: EASE_LUX,
                  delay: i * 0.08,
                }}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.4, ease: EASE_LUX },
                }}
                className="group relative overflow-hidden rounded-2xl glass card-interactive p-4"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[0.6rem] tabular-nums text-accent/70 transition-colors duration-300 group-hover:text-accent">
                    {m.w}
                  </span>
                  <span className="text-sm font-medium text-white">{m.k}</span>
                </div>
                <div className="mt-2 text-xs leading-relaxed text-white/55">
                  {m.v}
                </div>
              </motion.div>
            ))}
          </div>
        </ContentColumn>
      </Container>
    </Section>
  );
}
