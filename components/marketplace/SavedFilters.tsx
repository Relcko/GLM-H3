"use client";

import { useEffect, useState } from "react";
import type { SearchQuery } from "@relcko/marketplace";
import { buildQueryString } from "@/lib/marketplace/filters";
import { cn } from "./primitives";

interface Preset {
  name: string;
  query: SearchQuery;
}

const KEY = "relcko.marketplace.savedFilters.v1";

export function SavedFilters({
  query,
  onApply,
  className = "",
}: {
  query: SearchQuery;
  onApply: (q: SearchQuery) => void;
  className?: string;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPresets(JSON.parse(raw) as Preset[]);
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: Preset[]) {
    setPresets(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: Preset = { name: trimmed, query: { ...query, page: 0 } };
    persist([...presets.filter((p) => p.name !== trimmed), preset]);
    setName("");
  }

  function remove(n: string) {
    persist(presets.filter((p) => p.name !== n));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          placeholder="Name these filters…"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="flex-1 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-accent/40"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-accent/40 hover:text-white"
        >
          Save
        </button>
      </div>
      {presets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] pl-3 pr-1.5 py-1 text-xs text-white/70">
              <button type="button" className="hover:text-white" onClick={() => onApply(p.query)}>
                {p.name}
              </button>
              <button
                type="button"
                aria-label={`Remove saved filter ${p.name}`}
                onClick={() => remove(p.name)}
                className="text-white/40 transition hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-[0.7rem] text-white/35">
        Current: <code className="text-white/50">{buildQueryString(query) || "(no filters)"}</code>
      </p>
    </div>
  );
}
