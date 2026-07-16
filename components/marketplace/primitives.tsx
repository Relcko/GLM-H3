import type { ReactNode } from "react";

/** Tiny className joiner (no dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/40">{label}</span>
      <span className={cn("text-xl font-medium tabular-nums", accent ? "text-accent" : "text-white")}>{value}</span>
      {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
    </div>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  kicker,
  title,
  description,
  className = "",
}: {
  kicker?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {kicker ? <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">{kicker}</span> : null}
      <h2 className="text-chapter font-medium tracking-tight text-white">{title}</h2>
      {description ? <p className="max-w-2xl text-sm leading-relaxed text-white/55">{description}</p> : null}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-accent",
        className,
      )}
    />
  );
}
