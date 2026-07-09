"use client";

import { Section, Container, ContentColumn, Kicker, ChapterNumber } from "@/components/layout";
import { Reveal } from "@/components/Reveal";

const TIMELINE = [
  {
    q: "Q1",
    y: "2026",
    t: "Launch",
    d: "First flagship building tokenized · 4 markets live",
  },
  {
    q: "Q3",
    y: "2026",
    t: "Liquidity",
    d: "Secondary market opens · instant token trading",
  },
  {
    q: "Q2",
    y: "2027",
    t: "Scale",
    d: "12 developments · 3 continents · $1B AUM",
  },
  {
    q: "Q4",
    y: "2028",
    t: "Sovereign",
    d: "Sovereign-grade portfolio · AI valuation engine",
  },
];

export default function Chapter07() {
  return (
    <Section
      id="chapter-07"
      height="tall"
      center
      aria-labelledby="chapter-07-title"
    >
      <Container>
        <ContentColumn side="right" width="reading">
          <Reveal className="flex items-center gap-4">
            <ChapterNumber index="07" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Future</Kicker>
          </Reveal>

          <h2
            id="chapter-07-title"
            className="font-display text-chapter font-light gradient-text text-balance"
          >
            Scale beyond precedent.
          </h2>

          <Reveal className="max-w-sm text-balance text-sm leading-relaxed text-white/50">
            One building becomes a continent-spanning portfolio. The
            infrastructure for a new asset class.
          </Reveal>

          <div className="relative w-full pt-2 pl-2">
            <div className="absolute bottom-3 left-0 top-3 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
            <div className="flex flex-col gap-4">
              {TIMELINE.map((m, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="relative pl-7">
                    <span className="absolute left-[-5px] top-2 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-accent/15" />
                    <div className="group relative overflow-hidden rounded-2xl glass card-interactive p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm tabular-nums text-white/60">
                          {m.q} {m.y}
                        </span>
                        <div className="h-4 w-px bg-white/10" />
                        <div>
                          <div className="text-xs font-medium gold-text">{m.t}</div>
                          <div className="mt-0.5 text-xs text-white/45">{m.d}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </ContentColumn>
      </Container>
    </Section>
  );
}
