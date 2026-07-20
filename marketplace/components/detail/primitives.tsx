import type { ReactNode } from "react";

/** Consistent section wrapper for the property details surface. */
export function DetailSection({
  id,
  label,
  title,
  children,
  aside,
}: {
  id?: string;
  label?: string;
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-7"
    >
      {(label || title || aside) && (
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            {label && <div className="dashboard-label mb-2">{label}</div>}
            {title && (
              <h2 className="font-display text-xl font-light tracking-[-0.01em] text-white/95">
                {title}
              </h2>
            )}
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/** A small labelled figure used across detail stat grids. */
export function DetailStat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <span className="dashboard-label text-[0.5rem]">{label}</span>
      <span
        className={`text-base font-medium tabular-nums ${
          accent ? "text-accent" : "text-white/90"
        }`}
      >
        {value}
      </span>
      {sub != null && (
        <span className="text-[0.7rem] text-white/40">{sub}</span>
      )}
    </div>
  );
}
