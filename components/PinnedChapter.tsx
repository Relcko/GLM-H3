"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

type PinnedChapterProps = {
  id: string;
  /** Number of viewport heights the section occupies. Default 1.5. */
  heightVh?: number;
  children: (args: { progress: MotionValue<number> }) => ReactNode;
  /** Side the content aligns to. */
  side?: "left" | "right";
  /** Width of the content column. */
  width?: "narrow" | "reading" | "default" | "wide";
  className?: string;
};

const COL = {
  narrow: "md:w-[36%]",
  reading: "md:w-[44%]",
  default: "md:w-[50%]",
  wide: "md:w-[60%]",
};

/**
 * Pinned chapter with scrubbed content — Phase 2.
 *
 * Section is `heightVh * 100svh` tall; content sticks to the top of
 * the viewport via `position: sticky`. As the user scrolls, transforms
 * scrub from beginning to end of the section.
 *
 * Phase 2 changes:
 *   - Perspective on the sticky container (subtle 3D)
 *   - The sticky content subtly scales 0.97 -> 1.03 over the section,
 *     giving a "the camera is pushing in" feel
 *   - Default container gets a slight `translateZ` for layering
 *   - Slight horizontal "drift" tied to scroll progress for the
 *     cinematic parallax (the content feels like it has depth)
 */
export default function PinnedChapter({
  id,
  heightVh = 1.5,
  children,
  side = "right",
  width = "reading",
  className = "",
}: PinnedChapterProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Depth: an asymmetric "dolly" — the camera drifts in slowly over the
  // first ~60% of the section (scale 0.96 → 1.04), holds, then eases back
  // out (1.04 → 0.98) over the last 40%. Slow push-in, quicker release —
  // feels like a weighted cinema camera, not a symmetrical pulse.
  const depthScale = useTransform(
    scrollYProgress,
    [0, 0.6, 1],
    [0.96, 1.04, 0.98],
    { clamp: true }
  );
  const depthZ = useTransform(
    scrollYProgress,
    [0, 0.6, 1],
    [-40, 0, -40],
    { clamp: true }
  );

  // Edge defocus: a soft blur at the section's entry & exit so content
  // floats in/out of focus — depth continuity across chapter seams.
  const edgeBlur = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [6, 0, 0, 6],
    { clamp: true }
  );
  const filter = useTransform(edgeBlur, (b) => `blur(${b.toFixed(2)}px)`);

  return (
    <section
      ref={ref}
      id={id}
      style={{ height: `${heightVh * 100}svh` }}
      className={`relative w-full scroll-mt-24 ${className}`}
    >
      <div
        className="sticky top-0 z-[20] flex h-screen w-full items-center justify-center"
        style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
          <motion.div
            className={[
              "flex w-full flex-col gap-8 will-change-transform",
              side === "right" ? "md:ml-auto" : "md:mr-auto",
              COL[width],
            ].join(" ")}
            style={{
              scale: depthScale,
              z: depthZ,
              filter,
              transformStyle: "preserve-3d",
            }}
          >
            {children({ progress: scrollYProgress })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/**
 * ScrubbedReveal — Phase 2.
 *
 * Now depth-aware: combines opacity, vertical translate, blur, and a
 * subtle scale. Children feel like they're emerging out of the page.
 */
export function ScrubbedReveal({
  progress,
  range = [0, 0.4],
  y = 40,
  scale = 0.97,
  className = "",
  children,
  onMouseMove,
}: {
  progress: MotionValue<number>;
  range?: [number, number];
  y?: number;
  scale?: number;
  className?: string;
  children: ReactNode;
  onMouseMove?: (e: MouseEvent<HTMLElement>) => void;
}) {
  const opacity = useTransform(progress, range, [0, 1], { clamp: true });
  const ty = useTransform(progress, range, [y, 0], { clamp: true });
  const s = useTransform(progress, range, [scale, 1], { clamp: true });
  const blur = useTransform(progress, range, [10, 0], { clamp: true });
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  return (
    <motion.div
      className={className}
      style={{ opacity, y: ty, scale: s, filter, willChange: "transform, opacity, filter" }}
      onMouseMove={onMouseMove}
    >
      {children}
    </motion.div>
  );
}

/** Convenience: a scrubbed exit that fades out as the user scrolls past. */
export function ScrubbedExit({
  progress,
  range = [0.6, 1],
  y = -40,
  className = "",
  children,
}: {
  progress: MotionValue<number>;
  range?: [number, number];
  y?: number;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [1, 0], { clamp: true });
  const ty = useTransform(progress, range, [0, y], { clamp: true });
  const s = useTransform(progress, range, [1, 0.98], { clamp: true });
  return (
    <motion.div
      className={className}
      style={{ opacity, y: ty, scale: s, willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

/** Convenience: a number that scrubs from `from` -> `to` as progress 0->1. */
export function ScrubbedNumber({
  progress,
  from = 0,
  to = 100,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  progress: MotionValue<number>;
  from?: number;
  to?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const value = useTransform(progress, (p) => {
    const v = from + (to - from) * p;
    return v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  });
  return (
    <motion.span className={className}>
      {prefix}
      <motion.span>{value}</motion.span>
      {suffix}
    </motion.span>
  );
}
