"use client";

import { Kicker, ChapterNumber } from "@/components/layout";
import PinnedChapter, { ScrubbedReveal } from "@/components/PinnedChapter";

const NODES = [
  { k: "Wallet", v: "Custody & sign" },
  { k: "Marketplace", v: "Browse · buy" },
  { k: "NFT Titles", v: "Proof of ownership" },
  { k: "Governance", v: "Vote on building ops" },
  { k: "AI Assistant", v: "24/7 guidance" },
  { k: "Secondary", v: "Liquid exit, anytime" },
];

/**
 * Chapter 06 — Ecosystem (Pinned).
 *
 * Section is 1.6 viewports tall. Content sticks. Nodes reveal
 * in a stagger as the user scrolls.
 */
export default function Chapter06() {
  return (
    <PinnedChapter
      id="chapter-06"
      heightVh={1.6}
      side="left"
      width="reading"
    >
      {({ progress }) => (
        <>
          <ScrubbedReveal progress={progress} range={[0, 0.18]} className="flex items-center gap-4">
            <ChapterNumber index="06" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Ecosystem</Kicker>
          </ScrubbedReveal>

          <ScrubbedReveal progress={progress} range={[0.05, 0.22]} y={20}>
            <h2
              id="chapter-06-title"
              className="font-display text-chapter font-light gradient-text text-balance"
            >
              Everything,
              <br />
              connected.
            </h2>
          </ScrubbedReveal>

          <ScrubbedReveal
            progress={progress}
            range={[0.12, 0.3]}
            className="max-w-[20rem] text-balance text-sm leading-relaxed text-white/50"
          >
            A single platform. Every tool to acquire, govern and exit. Woven
            together — elegantly, securely.
          </ScrubbedReveal>

          <div className="relative grid w-full grid-cols-2 gap-3 sm:gap-4">
            {NODES.map((n, i) => {
              const start = 0.18 + i * 0.06;
              const end = start + 0.1;
              return (
                <ScrubbedReveal
                  key={n.k}
                  progress={progress}
                  range={[start, end]}
                  y={16}
                  className="group relative overflow-hidden rounded-2xl glass card-interactive p-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[0.6rem] tabular-nums text-accent/70 transition-colors duration-300 group-hover:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium text-white">{n.k}</span>
                  </div>
                  <div className="mt-1.5 pl-7 text-xs text-white/55">{n.v}</div>
                </ScrubbedReveal>
              );
            })}
          </div>
        </>
      )}
    </PinnedChapter>
  );
}