"use client";

import Link from "next/link";
import { AssetType, type Property, PropertyStatus } from "@relcko/domain-core";
import { formatMoney, formatPercent, formatTokens, parseLocation } from "@/lib/marketplace/format";
import { cn } from "./primitives";
import { StatusBadge } from "./StatusBadge";
import { FundingBar } from "./FundingBar";
import { BookmarkButton, FavoriteButton } from "./CollectionButtons";

const ASSET_LABEL: Record<AssetType, string> = {
  [AssetType.Residential]: "Residential",
  [AssetType.Commercial]: "Commercial",
  [AssetType.Land]: "Land",
};

function fundingPct(p: Property): number {
  if (p.totalTokens === 0n) return 0;
  return Number((p.soldTokens * 10_000n) / p.totalTokens) / 100;
}

export function PropertyCard({ property, className = "" }: { property: Property; className?: string }) {
  const { city, country } = parseLocation(property.location);
  const pct = fundingPct(property);
  const hero = property.images[0] ?? "/marketplace/property-01.svg";
  const preview = property.images[1] ?? hero;
  const soldOut = property.status === PropertyStatus.SoldOut;

  return (
    <Link
      href={`/marketplace/${property.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-card transition duration-400 ease-lux hover:-translate-y-1 hover:border-white/20 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero}
          alt={property.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 ease-lux group-hover:scale-[1.04] group-hover:opacity-0"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 ease-lux group-hover:opacity-100"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={property.status} />
        </div>
        <div className="absolute right-3 top-3">
          <FavoriteButton propertyId={property.id} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-3 left-3 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/70">
          {ASSET_LABEL[property.assetType]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-white/45">{city}, {country}</span>
          <h3 className="text-lg font-medium leading-tight text-white">{property.name}</h3>
        </div>

        <FundingBar pct={pct} />

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          <Metric label="ROI" value={formatPercent(property.expectedRoi)} />
          <Metric label="Yield" value={formatPercent(property.rentalYield)} />
          <Metric label="Min" value={formatMoney(property.minInvestment)} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-white/45">
            {formatTokens(property.availableTokens)} fractions left
          </span>
          <BookmarkButton propertyId={property.id} label={soldOut ? "Saved" : "Save"} />
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[0.55rem] uppercase tracking-wider text-white/40">{label}</span>
      <span className="text-sm font-medium tabular-nums text-white">{value}</span>
    </div>
  );
}
