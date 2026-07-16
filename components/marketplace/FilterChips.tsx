"use client";

import { AssetType, PropertyStatus } from "@relcko/domain-core";
import type { SearchQuery } from "@relcko/marketplace";
import { ASSET_TYPE_OPTIONS, STATUS_OPTIONS, activeFilterCount } from "@/lib/marketplace/filters";
import { cn } from "./primitives";

interface Chip {
  key: string;
  label: string;
  clear: Partial<SearchQuery>;
}

function buildChips(q: SearchQuery): Chip[] {
  const chips: Chip[] = [];
  const label = (v?: string) => v ?? "";
  if (q.keyword) chips.push({ key: "q", label: `“${q.keyword}”`, clear: { keyword: undefined } });
  if (q.country) chips.push({ key: "country", label: q.country, clear: { country: undefined } });
  if (q.city) chips.push({ key: "city", label: q.city, clear: { city: undefined } });
  if (q.assetType)
    chips.push({
      key: "assetType",
      label: ASSET_TYPE_OPTIONS.find((o) => o.value === q.assetType)?.label ?? label(q.assetType),
      clear: { assetType: undefined },
    });
  if (q.status)
    chips.push({
      key: "status",
      label: STATUS_OPTIONS.find((o) => o.value === q.status)?.label ?? label(q.status),
      clear: { status: undefined },
    });
  if (q.roiMin !== undefined || q.roiMax !== undefined)
    chips.push({ key: "roi", label: `ROI ${q.roiMin ?? 0}–${q.roiMax ?? "∞"}%`, clear: { roiMin: undefined, roiMax: undefined } });
  if (q.yieldMin !== undefined || q.yieldMax !== undefined)
    chips.push({ key: "yield", label: `Yield ${q.yieldMin ?? 0}–${q.yieldMax ?? "∞"}%`, clear: { yieldMin: undefined, yieldMax: undefined } });
  if (q.fundingMin !== undefined || q.fundingMax !== undefined)
    chips.push({ key: "funding", label: `Funded ${q.fundingMin ?? 0}–${q.fundingMax ?? 100}%`, clear: { fundingMin: undefined, fundingMax: undefined } });
  if (q.minInvestmentMax !== undefined)
    chips.push({ key: "minInv", label: `Min ≤ ${q.minInvestmentMax}`, clear: { minInvestmentMax: undefined } });
  if (q.availableOnly) chips.push({ key: "avail", label: "Available only", clear: { availableOnly: undefined } });
  return chips;
}

export function FilterChips({
  query,
  onChange,
  onClearAll,
  className = "",
}: {
  query: SearchQuery;
  onChange: (patch: Partial<SearchQuery>) => void;
  onClearAll: () => void;
  className?: string;
}) {
  const chips = buildChips(query);
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.clear)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-accent transition hover:border-accent/40"
        >
          {c.label}
          <span className="text-accent/60 group-hover:text-accent" aria-hidden="true">×</span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      {activeFilterCount(query) > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-full px-2 py-1 text-xs text-white/45 underline-offset-2 transition hover:text-white/80 hover:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
