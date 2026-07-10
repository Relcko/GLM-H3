"use client";

import { Section, Container, ContentColumn, Kicker, ChapterNumber } from "@/components/layout";
import { Reveal } from "@/components/Reveal";

const TIMELINE = [
  {
    q: "2026",
    y: "Q3",
    t: "",
    d: "Platform Launch, Token Launch & Initial Offering, Strategic Partnerships, Community Building & Awareness",
  },
  {
    q: "2026",
    y: "Q6",
    t: "",
    d: "Real World SVM Launch, First Real Estate Asset Tokenization, Wallet Integration, Governance Framework Introduction",
  },
  {
    q: "2027",
    y: "Q3",
    t: "",
    d: "Cross-Chain Integration, Advanced AI Advisors, Real Estate Index Fund, Institutional Onboarding",
  },
  {
    q: "2028",
    y: "Q6",
    t: "",
    d: "Global Expansion & Regulatory Compliance, AI-Powered Property Insights, Ecosystem Growth & Sustainability Vision 2029 Roadmap",
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
          <Reveal className="flex items-center gap-4 pl-11">
            <ChapterNumber index="07" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Future</Kicker>
          </Reveal>

          <h2
            id="chapter-07-title"
            className="pl-11 font-display text-chapter font-light gradient-text text-balance"
          >
            Scale beyond precedent.
          </h2>

          <Reveal className="max-w-[30rem] pl-11 text-balance text-sm leading-relaxed text-white/50">
            One building becomes a continent-spanning portfolio. The
            infrastructure for a new asset class.
          </Reveal>

          <div className="relative w-full pt-0">
            {/* Timeline line — aligned to first and last milestones */}
            <div className="absolute left-[11px] top-4 bottom-4 w-[0.5px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            <div className="flex flex-col gap-8">
              {TIMELINE.map((m, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="relative ml-3 pl-8">
                    {/* Dot — first milestone anchors the timeline */}
                    <span
                      className={`absolute left-[-4px] top-[22px] h-1.5 w-1.5 rounded-full ring-[2px] ${
                        i === 0
                          ? "bg-white/50 ring-white/10"
                          : "bg-white/20 ring-white/5"
                      }`}
                    />

                    {/* Editorial glass strip — almost disappears behind text */}
                    <div className="bg-black/25 backdrop-blur-2xl shadow-[0_4px_24px_-16px_rgba(0,0,0,0.35)] rounded-lg px-6 py-5 sm:px-7 sm:py-6">
                      <div className="flex flex-col">
                        <span className="font-mono text-[0.65rem] tabular-nums text-white/70 tracking-widest uppercase">
                          {m.q} {m.y}
                        </span>
                        {m.t && <h3 className="mt-2 text-base font-semibold text-white">{m.t}</h3>}
                        <p className={`text-sm text-white/65 leading-relaxed ${m.t ? "mt-1" : "mt-2"}`}>{m.d}</p>
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
