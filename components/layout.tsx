"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";

/**
 * Layout primitives — small composable wrappers used by all chapters
 * and supporting sections. They make layout decisions a property of
 * the section, not of a rigid shell.
 */

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Vertical height preset. */
  height?: "screen" | "tall" | "auto";
  /** Center content vertically. */
  center?: boolean;
  /** Reduced vertical padding for compact sections like FAQ. */
  compact?: boolean;
  /** Background-level styling (rare — usually transparent). */
  surface?: "default" | "muted" | "deep";
} & HTMLAttributes<HTMLElement>;

const HEIGHT = {
  screen: "min-h-[100svh] scroll-mt-24",
  tall: "min-h-[120svh] scroll-mt-24",
  auto: "scroll-mt-24",
};

const SURFACE = {
  default: "",
  muted: "",
  deep: "",
};

export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  {
    id,
    children,
    className = "",
    height = "screen",
    center = true,
    compact = false,
    surface = "default",
    ...rest
  },
  ref
) {
  return (
    <section
      ref={ref}
      id={id}
      className={[
        "relative flex w-full flex-col px-5 sm:px-8 md:px-12 lg:px-16",
        HEIGHT[height],
        center ? "justify-center" : "",
        compact ? "py-20 sm:py-24" : "",
        SURFACE[surface], // no backgrounds — seamless cinematic canvas
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </section>
  );
});

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl ${className}`}>
      {children}
    </div>
  );
}

type ContentColumnProps = {
  children: ReactNode;
  /** Side the content aligns to on desktop. */
  side?: "left" | "right" | "center";
  /** Width of the content column on desktop. */
  width?: "narrow" | "reading" | "default" | "wide" | "full";
  className?: string;
};

const COL = {
  narrow: "md:w-[34%]",
  reading: "md:w-[40%]",
  default: "md:w-[46%]",
  wide: "md:w-[54%]",
  full: "w-full",
};

const SIDE = {
  left: "md:mr-auto",
  right: "md:ml-auto",
  center: "mx-auto",
};

export function ContentColumn({
  children,
  side = "left",
  width = "reading",
  className = "",
}: ContentColumnProps) {
  return (
    <div
      className={[
        "flex w-full flex-col gap-6",
        SIDE[side],
        COL[width],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Small uppercase label used as chapter kicker. */
export function Kicker({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <span
      className={[
        "font-mono text-[0.62rem] uppercase tracking-[0.45em]",
        accent ? "text-accent/70" : "text-white/35",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/** Chapter number, used at top of each chapter. */
export function ChapterNumber({ index, accent = true }: { index: string; accent?: boolean }) {
  return (
    <span
      className={[
        "font-mono text-[0.65rem] tabular-nums",
        accent ? "text-accent/60" : "text-white/30",
      ].join(" ")}
    >
      {index}
    </span>
  );
}
