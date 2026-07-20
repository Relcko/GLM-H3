"use client";

import { AssetType, PropertyStatus } from "@relcko/domain-core";
import type { SearchQuery } from "@relcko/marketplace";
import {
  ASSET_TYPE_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/marketplace/filters";
import { cn } from "./primitives";

interface Props {
  query: SearchQuery;
  onChange: (patch: Partial<SearchQuery>) => void;
  className?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-white/40">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  "rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent/40";

export function FiltersPanel({ query, onChange, className = "" }: Props) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <Field label="Country">
        <select
          className={selectClass}
          value={query.country ?? ""}
          onChange={(e) => onChange({ country: e.target.value || undefined })}
        >
          <option value="">All countries</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="City">
        <select
          className={selectClass}
          value={query.city ?? ""}
          onChange={(e) => onChange({ city: e.target.value || undefined })}
        >
          <option value="">All cities</option>
          {CITY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Property type">
        <select
          className={selectClass}
          value={query.assetType ?? ""}
          onChange={(e) => onChange({ assetType: (e.target.value || undefined) as AssetType | undefined })}
        >
          <option value="">All types</option>
          {ASSET_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <select
          className={selectClass}
          value={query.status ?? ""}
          onChange={(e) => onChange({ status: (e.target.value || undefined) as PropertyStatus | undefined })}
        >
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="ROI range (%)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            className={cn(selectClass, "w-full")}
            value={query.roiMin ?? ""}
            onChange={(e) => onChange({ roiMin: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span className="text-white/30">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            className={cn(selectClass, "w-full")}
            value={query.roiMax ?? ""}
            onChange={(e) => onChange({ roiMax: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </Field>

      <Field label="Rental yield range (%)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            className={cn(selectClass, "w-full")}
            value={query.yieldMin ?? ""}
            onChange={(e) => onChange({ yieldMin: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span className="text-white/30">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            className={cn(selectClass, "w-full")}
            value={query.yieldMax ?? ""}
            onChange={(e) => onChange({ yieldMax: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </Field>

      <Field label="Funding progress (%)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            className={cn(selectClass, "w-full")}
            value={query.fundingMin ?? ""}
            onChange={(e) => onChange({ fundingMin: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span className="text-white/30">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            className={cn(selectClass, "w-full")}
            value={query.fundingMax ?? ""}
            onChange={(e) => onChange({ fundingMax: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </Field>

      <Field label="Max minimum investment (USDT)">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Any"
          className={selectClass}
          value={query.minInvestmentMax ?? ""}
          onChange={(e) => onChange({ minInvestmentMax: e.target.value ? Number(e.target.value) : undefined })}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={query.availableOnly ?? false}
          onChange={(e) => onChange({ availableOnly: e.target.checked || undefined })}
        />
        Available fractions only
      </label>
    </div>
  );
}
