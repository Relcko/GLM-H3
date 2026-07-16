"use client";

import { useMemo, useState } from "react";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { MarketplaceToolbar } from "./MarketplaceToolbar";
import { MarketplaceSidebar } from "./MarketplaceSidebar";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";
import {
  useBookmarks,
  useCollections,
  useMarketplaceData,
  useMarketplaceFilters,
  useMarketplaceSearch,
  useMarketplaceSort,
} from "@/marketplace/hooks";
import { getFilterOptions, matchesFilters, matchesQuery } from "@/marketplace/utils";
import { getSortComparator } from "@/marketplace/utils/sorting";
import { FilterChips } from "./FilterChips";
import { MapPlaceholder } from "./MapPlaceholder";

export function MarketplaceLayout() {
  const { status, properties, retry } = useMarketplaceData();
  const search = useMarketplaceSearch();
  const filters = useMarketplaceFilters();
  const sort = useMarketplaceSort();
  const bookmarks = useBookmarks();
  const collections = useCollections();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const filterOptions = useMemo(
    () => (properties.length ? getFilterOptions(properties) : null),
    [properties]
  );

  const visible = useMemo(() => {
    if (status !== "populated") return [];
    const q = search.debounced;
    const list = properties.filter(
      (p) => matchesQuery(p, q) && matchesFilters(p, filters.filters)
    );
    return [...list].sort(getSortComparator(sort.sort));
  }, [status, properties, search.debounced, filters.filters, sort.sort]);

  const summary = useMemo(() => {
    const total = properties.length;
    const totalTargetRaise = properties.reduce((s, p) => s + p.targetRaise, 0);
    const avgRoi =
      total > 0 ? properties.reduce((s, p) => s + p.expectedRoi, 0) / total : 0;
    const activeCount = properties.filter((p) => p.status === "active").length;
    return { total, totalTargetRaise, avgRoi, activeCount };
  }, [properties]);

  const showChrome = status === "populated" || status === "empty";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
      <MarketplaceHeader
        totalProperties={summary.total}
        totalTargetRaise={summary.totalTargetRaise}
        avgRoi={summary.avgRoi}
        activeCount={summary.activeCount}
      />

      <div className="mt-8 flex gap-6">
        {filterOptions && (
          <MarketplaceSidebar
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            filters={filters.filters}
            options={filterOptions}
            toggleInArray={filters.toggleInArray}
            setRange={filters.setRange}
            reset={filters.reset}
            activeCount={filters.activeCount(filters.filters)}
            onApplyPreset={filters.setFilters}
          />
        )}

        <main className="min-w-0 flex-1">
          {status === "populated" && filterOptions && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <FilterChips
                filters={filters.filters}
                options={filterOptions}
                toggleInArray={filters.toggleInArray}
                setRange={filters.setRange}
                reset={filters.reset}
                activeCount={filters.activeCount(filters.filters)}
              />
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 transition-colors hover:border-accent/30 hover:text-accent"
              >
                {showMap ? "Hide map" : "Show map"}
              </button>
            </div>
          )}

          {status === "populated" && showMap && filterOptions && (
            <div className="mb-6">
              <MapPlaceholder properties={visible} />
            </div>
          )}

          {showChrome && (
            <MarketplaceToolbar
              query={search.query}
              setQuery={search.setQuery}
              sort={sort.sort}
              setSort={sort.setSort}
              resultCount={visible.length}
              totalCount={properties.length}
              activeFilterCount={filters.activeCount(filters.filters)}
              bookmarkCount={bookmarks.count}
              favoriteCount={collections.favoriteCount}
              compareCount={collections.compareCount}
              onOpenFilters={() => setFiltersOpen(true)}
              onClearSearch={search.clear}
            />
          )}

          <div className="mt-6">
            {status === "loading" && <LoadingSkeleton count={9} />}

            {status === "error" && (
              <EmptyState variant="error" onRetry={retry} />
            )}

            {status === "populated" && visible.length === 0 && (
              <EmptyState
                variant="no-results"
                resultCount={0}
                totalCount={properties.length}
                onResetFilters={filters.reset}
              />
            )}

            {status === "empty" && visible.length === 0 && (
              <EmptyState variant="empty" />
            )}

            {status === "populated" && visible.length > 0 && (
              <MarketplaceGrid
                properties={visible}
                isBookmarked={bookmarks.isBookmarked}
                onToggleBookmark={bookmarks.toggle}
                isFavourite={collections.isFavourite}
                onToggleFavorite={collections.toggleFavorite}
                isComparing={collections.isComparing}
                onToggleCompare={collections.addToComparison}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
