"use client";

import type { SearchQuery } from "@relcko/marketplace";
import { SORT_OPTIONS } from "@/lib/marketplace/filters";
import { cn } from "./primitives";

export function SortControl({
  query,
  onChange,
  className = "",
}: {
  query: SearchQuery;
  onChange: (patch: Partial<SearchQuery>) => void;
  className?: string;
}) {
  const sort = query.sort ?? "createdAt";
  const order = query.order ?? "desc";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label className="sr-only" htmlFor="sort-select">Sort by</label>
      <select
        id="sort-select"
        className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent/40"
        value={sort}
        onChange={(e) => onChange({ sort: e.target.value as SearchQuery["sort"] })}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        aria-label={`Toggle sort order (currently ${order})`}
        onClick={() => onChange({ order: order === "desc" ? "asc" : "desc" })}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition hover:border-accent/40 hover:text-white"
      >
        {order === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
}
