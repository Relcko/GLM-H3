"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import type { MarketplaceProperty } from "@/marketplace/types";
import { PropertyBadge, StatusBadge, ASSET_LABEL } from "./PropertyBadge";
import { PropertyProgress, PropertyStats } from "./PropertyStats";
import { BookmarkButton } from "./BookmarkButton";
import { FavoriteButton } from "./FavoriteButton";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from "@/marketplace/utils/format";

function PropertyCardBase({
  property,
  isBookmarked,
  onToggleBookmark,
  isFavourite = false,
  onToggleFavorite,
  isComparing = false,
  onToggleCompare,
}: {
  property: MarketplaceProperty;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  isFavourite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (id: string) => void;
}) {
  const hero = property.images[0] ?? "/marketplace/property-01.svg";
  const detailHref = `/marketplace/${property.slug}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE_LUX }}
      className="dashboard-card group flex flex-col overflow-hidden rounded-2xl"
    >
      {/* Hero */}
      <Link
        href={detailHref}
        aria-label={`View ${property.name}`}
        className="relative block aspect-[16/10] w-full overflow-hidden"
      >
        <Image
          src={hero}
          alt={property.name}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-lux group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 via-bg-base/10 to-transparent" />

        <div className="absolute left-3 top-3">
          <StatusBadge status={property.status} />
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          {onToggleFavorite && (
            <FavoriteButton
              isFavourite={isFavourite}
              onToggle={() => onToggleFavorite(property.id)}
            />
          )}
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={() => onToggleBookmark(property.id)}
          />
        </div>

        {property.hasSpv && (
          <div className="absolute bottom-3 left-3">
            <PropertyBadge tone="gold" className="backdrop-blur-md">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
              </svg>
              SPV-Backed
            </PropertyBadge>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-xs">
          <PropertyBadge tone="accent">{ASSET_LABEL[property.assetType]}</PropertyBadge>
          <span className="text-white/45">
            {property.city}, {property.country}
          </span>
        </div>

        <div>
          <Link href={detailHref} className="block">
            <h3 className="font-display text-lg font-light leading-tight text-white/95 transition-colors group-hover:text-white">
              {property.name}
            </h3>
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/50">
            {property.description}
          </p>
        </div>

        <PropertyStats
          expectedRoi={property.expectedRoi}
          rentalYield={property.rentalYield}
          occupancy={property.occupancy}
        />

        <PropertyProgress value={property.fundingProgress} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Figure label="Target Raise" value={formatCompactCurrency(property.targetRaise)} />
          <Figure label="Raised" value={formatCompactCurrency(property.raisedAmount)} />
          <Figure label="Min Investment" value={formatCurrency(property.minInvestment)} />
          <Figure label="Available" value={`${formatNumber(property.availableFractions)} frac`} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-white/45">
            {formatCurrency(property.tokenPrice)}
            <span className="text-white/30"> / fraction</span>
          </span>
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(property.id)}
                aria-pressed={isComparing}
                className={`rounded-full border px-3 py-2 text-xs transition-colors duration-200 ease-lux ${
                  isComparing
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                Compare
              </button>
            )}
            <Link
              href={detailHref}
              className="dashboard-btn dashboard-btn-primary !px-4 !py-2 !text-xs"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="dashboard-label text-[0.5rem]">{label}</span>
      <span className="text-sm font-medium tabular-nums text-white/90">{value}</span>
    </div>
  );
}

export const PropertyCard = memo(PropertyCardBase);
