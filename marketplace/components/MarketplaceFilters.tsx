"use client";

import type {
  FilterOptions,
  FilterState,
  RangeKey,
} from "@/marketplace/types";
import { ASSET_LABEL, STATUS_LABEL } from "./PropertyBadge";
import { SavedFilters } from "./SavedFilters";

export interface MarketplaceFiltersProps {
  filters: FilterState;
  options: FilterOptions;
  toggleInArray: <T,>(key: keyof FilterState, value: T) => void;
  setRange: (key: RangeKey, min: number | null, max: number | null) => void;
  reset: () => void;
  activeCount: number;
  onApplyPreset?: (filters: FilterState) => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/[0.06] px-5 py-4 first:border-t-0">
      <div className="dashboard-label mb-3">{title}</div>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors duration-200 ease-lux hover:bg-white/[0.03]"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ease-lux ${
          checked
            ? "border-accent bg-accent/20 text-accent"
            : "border-white/15 bg-transparent text-transparent"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={checked ? "text-white/90" : "text-white/60"}>{label}</span>
    </button>
  );
}

function RangeRow({
  value,
  bounds,
  onChange,
  prefix = "",
}: {
  value: { min: number | null; max: number | null };
  bounds: [number, number];
  onChange: (min: number | null, max: number | null) => void;
  prefix?: string;
}) {
  const parse = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        aria-label="Minimum"
        placeholder={String(bounds[0])}
        value={value.min ?? ""}
        onChange={(e) => onChange(parse(e.target.value), value.max)}
        className="dashboard-input !rounded-lg !px-3 !py-2 text-sm"
      />
      <span className="text-white/30">–</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label="Maximum"
        placeholder={String(bounds[1])}
        value={value.max ?? ""}
        onChange={(e) => onChange(value.min, parse(e.target.value))}
        className="dashboard-input !rounded-lg !px-3 !py-2 text-sm"
      />
      {prefix && <span className="text-xs text-white/40">{prefix}</span>}
    </div>
  );
}

export function MarketplaceFilters({
  filters,
  options,
  toggleInArray,
  setRange,
  reset,
  activeCount,
  onApplyPreset,
}: MarketplaceFiltersProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="dashboard-label">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.6rem] font-medium text-accent">
              {activeCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={activeCount === 0}
          className="text-xs text-white/45 transition-colors duration-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Reset
        </button>
      </div>

      <Section title="Country">
        <div className="flex flex-col gap-0.5">
          {options.countries.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={filters.countries.includes(c)}
              onToggle={() => toggleInArray("countries", c)}
            />
          ))}
        </div>
      </Section>

      <Section title="City">
        <div className="flex flex-col gap-0.5">
          {options.cities.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={filters.cities.includes(c)}
              onToggle={() => toggleInArray("cities", c)}
            />
          ))}
        </div>
      </Section>

      <Section title="Property Type">
        <div className="flex flex-col gap-0.5">
          {options.assetTypes.map((t) => (
            <CheckRow
              key={t}
              label={ASSET_LABEL[t]}
              checked={filters.assetTypes.includes(t)}
              onToggle={() => toggleInArray("assetTypes", t)}
            />
          ))}
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-col gap-0.5">
          {options.statuses.map((s) => (
            <CheckRow
              key={s}
              label={STATUS_LABEL[s]}
              checked={filters.statuses.includes(s)}
              onToggle={() => toggleInArray("statuses", s)}
            />
          ))}
        </div>
      </Section>

      <Section title="Expected ROI (%)">
        <RangeRow
          value={filters.roi}
          bounds={options.roiRange}
          onChange={(min, max) => setRange("roi", min, max)}
        />
      </Section>

      <Section title="Price / Fraction ($)">
        <RangeRow
          value={filters.price}
          bounds={options.priceRange}
          onChange={(min, max) => setRange("price", min, max)}
          prefix="USD"
        />
      </Section>

      <Section title="Funding (%)">
        <RangeRow
          value={filters.funding}
          bounds={options.fundingRange}
          onChange={(min, max) => setRange("funding", min, max)}
        />
      </Section>

      {onApplyPreset && (
        <SavedFilters filters={filters} onApply={onApplyPreset} />
      )}
    </div>
  );
}
