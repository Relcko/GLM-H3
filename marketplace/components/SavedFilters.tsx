"use client";

import { useCallback, useEffect, useState } from "react";
import type { FilterState } from "@/marketplace/types";
import { EMPTY_FILTERS } from "@/marketplace/hooks/useMarketplaceFilters";

interface SavedFiltersProps {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

interface Preset {
  name: string;
  filters: FilterState;
}

const STORAGE_KEY = "relcko.marketplace.savedFilters";

function readPresets(): Preset[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
}

function writePresets(presets: Preset[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

function filtersEqual(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SavedFilters({ filters, onApply }: SavedFiltersProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const initial = readPresets();
    queueMicrotask(() => setPresets(initial));
  }, []);

  const save = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [
      ...presets.filter((p) => p.name !== trimmed),
      { name: trimmed, filters },
    ];
    setPresets(next);
    writePresets(next);
    setName("");
    setNaming(false);
  }, [name, presets, filters]);

  const remove = useCallback(
    (presetName: string) => {
      const next = presets.filter((p) => p.name !== presetName);
      setPresets(next);
      writePresets(next);
    },
    [presets]
  );

  const isCurrent = (f: FilterState) => filtersEqual(f, filters);
  const hasActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-3">
      <span className="dashboard-label">Saved Filters</span>
      {presets.length === 0 && !naming && (
        <span className="text-xs text-white/35">None yet</span>
      )}
      {presets.map((p) => (
        <span
          key={p.name}
          className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
            isCurrent(p.filters)
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-white/10 text-white/60 hover:border-white/25"
          }`}
        >
          <button type="button" onClick={() => onApply(p.filters)}>
            {p.name}
          </button>
          <button
            type="button"
            onClick={() => remove(p.name)}
            aria-label={`Delete ${p.name}`}
            className="text-white/40 transition-colors hover:text-red-300"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </span>
      ))}

      {!naming && hasActive && (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-white/55 transition-colors hover:border-accent/30 hover:text-accent"
        >
          + Save current
        </button>
      )}
      {naming && (
        <span className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setNaming(false);
            }}
            placeholder="Name…"
            aria-label="Filter preset name"
            className="dashboard-input !w-32 !rounded-full !px-3 !py-1 text-xs"
          />
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent"
          >
            Save
          </button>
        </span>
      )}
    </div>
  );
}
