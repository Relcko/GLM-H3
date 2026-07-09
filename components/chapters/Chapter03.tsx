"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Section, Container, ContentColumn, Kicker, ChapterNumber } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { EASE_LUX } from "@/lib/motion";

const PILLARS = [
  {
    k: "Smart Contracts",
    v: "Self-executing, audited, immutable. Ownership transferred in seconds.",
  },
  {
    k: "Immutable Ownership",
    v: "Recorded on-chain. Permanent. Verifiable by anyone, anywhere.",
  },
  {
    k: "Institutional Security",
    v: "Multi-sig custody, audited code, $250M protocol insurance.",
  },
  {
    k: "Radical Transparency",
    v: "Every transaction, every yield, every decision — public by design.",
  },
];

export default function Chapter03() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-12% 0px" });
  const [cardsRevealed, setCardsRevealed] = useState(false);

  useEffect(() => { if (cardsInView) setCardsRevealed(true); }, [cardsInView]);
  useEffect(() => { const t = setTimeout(() => setCardsRevealed(true), 4000); return () => clearTimeout(t); }, []);

  return (
    <Section
      id="chapter-03"
      height="tall"
      center
      aria-labelledby="chapter-03-title"
    >
      <Container>
        <ContentColumn side="right" width="reading">
          <Reveal className="flex items-center gap-4">
            <ChapterNumber index="03" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Innovation</Kicker>
          </Reveal>

          <h2
            id="chapter-03-title"
            className="font-display text-chapter font-light gradient-text text-balance"
          >
            Built on unshakeable trust.
          </h2>

          <Reveal className="max-w-sm text-balance text-sm leading-relaxed text-white/50">
            We replaced lawyers, ledgers and middlemen with cryptography. What
            remains is something that cannot be corrupted.
          </Reveal>

          <div ref={cardsRef} className="flex flex-col gap-3">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.k}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={cardsRevealed ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 24, filter: "blur(8px)" }}
                transition={{
                  duration: 0.8,
                  ease: EASE_LUX,
                  delay: i * 0.08,
                }}
                whileHover={{
                  y: -3,
                  transition: { duration: 0.4, ease: EASE_LUX },
                }}
                className="group relative overflow-hidden rounded-2xl glass card-interactive p-4"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[0.6rem] tabular-nums text-accent/70 transition-colors duration-300 group-hover:text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{p.k}</div>
                    <div className="mt-1 text-xs leading-relaxed text-white/55">
                      {p.v}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ContentColumn>
      </Container>
    </Section>
  );
}