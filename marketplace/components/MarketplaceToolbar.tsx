"use client";

import Link from "next/link";
import { SORT_LABELS } from "@/marketplace/hooks/useMarketplaceSort";
import type { SortKey } from "@/marketplace/types";

interface MarketplaceToolbarProps {
  query: string;
  setQuery: (v: string) => void;
  sort: SortKey;
  setSort: (k: SortKey) => void;
  resultCount: number;
  totalCount: number;
  activeFilterCount: number;
  bookmarkCount: number;
  favoriteCount: number;
  compareCount: number;
  onOpenFilters: () => void;
  onClearSearch: () => void;
}

export function MarketplaceToolbar({
  query,
  setQuery,
  sort,
  setSort,
  resultCount,
  totalCount,
  activeFilterCount,
  bookmarkCount,
  favoriteCount,
  compareCount,
  onOpenFilters,
  onClearSearch,
}: MarketplaceToolbarProps) {
  return (
    <div className="dashboard-glass sticky top-20 z-30 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      {/* Search */}
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, city, country or type…"
          className="dashboard-input !rounded-xl !py-2.5 !pl-10 !pr-10"
          aria-label="Search properties"
        />
        {query && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-white/40 sm:block">Sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort properties"
          className="dashboard-input !w-auto !rounded-xl !py-2.5 !pr-8 !text-sm"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k} className="bg-bg-base text-white">
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile filter toggle */}
      <button
        type="button"
        onClick={onOpenFilters}
        className="dashboard-btn dashboard-btn-primary !px-4 !py-2.5 !text-xs lg:hidden"
      >
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 rounded-full bg-accent/30 px-1.5 text-[0.6rem]">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Result count */}
      <div className="hidden items-center gap-3 text-xs text-white/45 md:flex">
        <span className="tabular-nums text-white/80">{resultCount}</span>
        <span>of {totalCount} properties</span>
        {bookmarkCount > 0 && (
          <span className="flex items-center gap-1 text-accent/80">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
            {bookmarkCount}
          </span>
        )}
        {favoriteCount > 0 && (
          <span className="flex items-center gap-1 text-[#FF6B8A]/80">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {favoriteCount}
          </span>
        )}
        {compareCount > 0 && (
          <span className="flex items-center gap-1 text-white/70">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h7M3 12h7M3 18h7M14 6h7M14 12h7M14 18h7" />
            </svg>
            {compareCount}
          </span>
        )}
      </div>

      {/* Collections link */}
      <Link
        href="/marketplace/collections"
        className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 transition-colors hover:border-accent/30 hover:text-accent lg:flex"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18v14H3zM3 9h18M9 5v14" />
        </svg>
        Collections
      </Link>
    </div>
  );
}
