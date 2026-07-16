"use client";

import type { FilterState, FilterOptions, RangeKey } from "@/marketplace/types";
import { ASSET_LABEL, STATUS_LABEL } from "./PropertyBadge";

interface FilterChipsProps {
  filters: FilterState;
  options: FilterOptions;
  toggleInArray: <T,>(key: keyof FilterState, value: T) => void;
  setRange: (key: RangeKey, min: number | null, max: number | null) => void;
  reset: () => void;
  activeCount: number;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-accent transition-colors hover:border-accent/40"
    >
      {label}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export function FilterChips({
  filters,
  options,
  toggleInArray,
  setRange,
  reset,
  activeCount,
}: FilterChipsProps) {
  if (activeCount === 0) return null;

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "roi", label: "ROI" },
    { key: "price", label: "Price" },
    { key: "funding", label: "Funding" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.countries.map((c) => (
        <Chip key={`c-${c}`} label={c} onRemove={() => toggleInArray("countries", c)} />
      ))}
      {filters.cities.map((c) => (
        <Chip key={`ct-${c}`} label={c} onRemove={() => toggleInArray("cities", c)} />
      ))}
      {filters.assetTypes.map((t) => (
        <Chip key={`a-${t}`} label={ASSET_LABEL[t]} onRemove={() => toggleInArray("assetTypes", t)} />
      ))}
      {filters.statuses.map((s) => (
        <Chip key={`s-${s}`} label={STATUS_LABEL[s]} onRemove={() => toggleInArray("statuses", s)} />
      ))}
      {ranges.map(({ key, label }) => {
        const r = filters[key];
        if (r.min == null && r.max == null) return null;
        const text = `${label}: ${r.min ?? "−"}–${r.max ?? "∞"}`;
        return (
          <Chip
            key={`r-${key}`}
            label={text}
            onRemove={() => setRange(key, null, null)}
          />
        );
      })}
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 transition-colors hover:text-white"
      >
        Clear all
      </button>
    </div>
  );
}
