"use client";

import Link from "next/link";
import { ASSET_LABEL, PropertyBadge, StatusBadge } from "../PropertyBadge";
import { BookmarkButton } from "../BookmarkButton";
import { FavoriteButton } from "../FavoriteButton";
import type { MarketplaceProperty } from "@/marketplace/types";

export function PropertyHeader({
  property,
  isBookmarked,
  isFavourite,
  isWatched,
  onToggleBookmark,
  onToggleFavorite,
  onToggleWatch,
}: {
  property: MarketplaceProperty;
  isBookmarked: boolean;
  isFavourite: boolean;
  isWatched: boolean;
  onToggleBookmark: () => void;
  onToggleFavorite: () => void;
  onToggleWatch: () => void;
}) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        href="/marketplace"
        className="inline-flex w-fit items-center gap-2 text-xs text-white/45 transition-colors hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Marketplace
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={property.status} />
            <PropertyBadge tone="accent">{ASSET_LABEL[property.assetType]}</PropertyBadge>
            {property.hasSpv && (
              <PropertyBadge tone="gold">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
                </svg>
                SPV-Backed
              </PropertyBadge>
            )}
          </div>
          <h1 className="font-display text-3xl font-light leading-tight tracking-[-0.02em] text-white/95 sm:text-4xl">
            {property.name}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {property.address} · {property.city}, {property.country}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BookmarkButton isBookmarked={isBookmarked} onToggle={onToggleBookmark} />
          <FavoriteButton isFavourite={isFavourite} onToggle={onToggleFavorite} />
          <button
            type="button"
            onClick={onToggleWatch}
            aria-pressed={isWatched}
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-all duration-300 ease-lux ${
              isWatched
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {isWatched ? "Watching" : "Watch"}
          </button>
        </div>
      </div>
    </header>
  );
}
