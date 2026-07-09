"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Section, Kicker, ChapterNumber } from "@/components/layout";
import PinnedChapter, { ScrubbedReveal, ScrubbedNumber } from "@/components/PinnedChapter";

const LAYERS = [
  { k: "Physical asset", v: "A real, audited building", w: "100%" },
  { k: "Legal entity", v: "SPV per property", w: "82%" },
  { k: "On-chain tokens", v: "10,000 owner tokens", w: "64%" },
  { k: "Your wallet", v: "From one token", w: "30%" },
];

/**
 * Chapter 04 — Tokenization (Pinned).
 *
 * The section is 1.6 viewports tall. Content sticks to viewport.
 * As the user scrolls, layers build up sequentially, the headline
 * compresses slightly, and the "$1 minimum" stat is scrubbed in.
 */
export default function Chapter04() {
  return (
    <PinnedChapter
      id="chapter-04"
      heightVh={1.6}
      side="left"
      width="reading"
      className=""
    >
      {({ progress }) => (
        <>
          <ScrubbedReveal progress={progress} range={[0, 0.25]} className="flex items-center gap-4">
            <ChapterNumber index="04" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Tokenization</Kicker>
          </ScrubbedReveal>

          <ScrubbedReveal
            progress={progress}
            range={[0.05, 0.3]}
            y={20}
          >
            <h2
              id="chapter-04-title"
              className="font-display text-chapter font-light gradient-text text-balance"
            >
              One building.
              <br />
              Thousands of owners.
            </h2>
          </ScrubbedReveal>

          <ScrubbedReveal
            progress={progress}
            range={[0.15, 0.4]}
            className="max-w-[20rem] text-balance text-sm leading-relaxed text-white/50"
          >
            A $40M asset becomes 10,000 tokens. You own a slice. Yields flow
            directly to your wallet. Liquidity, always.
          </ScrubbedReveal>

          <div className="flex w-full flex-col gap-2 pt-2">
            {LAYERS.map((l, i) => (
              <LayerRow key={l.k} index={i} progress={progress} layer={l} />
            ))}
          </div>

          <ScrubbedReveal
            progress={progress}
            range={[0.55, 0.85]}
            y={20}
            className="pt-4"
          >
            <div className="flex items-baseline gap-4">
              <span className="font-display text-5xl font-semibold accent-text">
                <ScrubbedNumber progress={progress} from={0} to={1} prefix="$" />
              </span>
              <span className="text-sm text-white/65">
                minimum ownership. No thresholds.
              </span>
            </div>
          </ScrubbedReveal>
        </>
      )}
    </PinnedChapter>
  );
}

function LayerRow({
  index,
  layer,
  progress,
}: {
  index: number;
  layer: { k: string; v: string; w: string };
  progress: MotionValue<number>;
}) {
  // each layer reveals in a stagger across progress 0.25..0.55
  const start = 0.25 + index * 0.07;
  const end = start + 0.12;
  const w = useTransform(progress, [start, end], ["0%", layer.w], {
    clamp: true,
  });
  return (
    <ScrubbedReveal
      progress={progress}
      range={[start, end]}
      y={16}
    >
      <div className="group relative overflow-hidden rounded-2xl glass card-interactive p-0">
        <motion.div
          style={{ width: w }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-blue/30 via-accent/15 to-transparent"
        />
        <div className="relative flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium text-white">{layer.k}</div>
            <div className="mt-0.5 text-xs text-white/55">{layer.v}</div>
          </div>
          <span className="font-mono text-xs text-white/35">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
    </ScrubbedReveal>
  );
}
