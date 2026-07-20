"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import { useCollections } from "@/marketplace/hooks/useCollections";
import { getMarketplaceProperties } from "@/marketplace/mock";
import { MarketplaceGrid } from "../MarketplaceGrid";
import { EmptyState } from "../EmptyState";
import { ASSET_LABEL, StatusBadge } from "../PropertyBadge";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/marketplace/utils/format";
import type { MarketplaceProperty } from "@/marketplace/types";

type Tab = "bookmarks" | "favorites" | "watchlist" | "recent" | "compare";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookmarks", label: "Bookmarks" },
  { id: "favorites", label: "Favourites" },
  { id: "watchlist", label: "Watchlist" },
  { id: "recent", label: "Recently Viewed" },
  { id: "compare", label: "Comparison" },
];

export function CollectionsView() {
  const collections = useCollections();
  const [tab, setTab] = useState<Tab>("bookmarks");
  const all = useMemo(() => getMarketplaceProperties(), []);

  const byIds = (ids: string[]): MarketplaceProperty[] =>
    ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is MarketplaceProperty => p != null);

  const bookmarks = byIds(Array.from(collections.bookmarks));
  const favorites = byIds(Array.from(collections.favorites));
  const watchlist = byIds(Array.from(collections.watchlist));
  const recent = byIds(collections.recentlyViewed);
  const compare = byIds(collections.comparison);

  const counts: Record<Tab, number> = {
    bookmarks: bookmarks.length,
    favorites: favorites.length,
    watchlist: watchlist.length,
    recent: recent.length,
    compare: compare.length,
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="dashboard-accent-line" />
          <span className="dashboard-label">My Collections</span>
        </div>
        <h1 className="font-display text-3xl font-light tracking-[-0.02em] text-white/95 sm:text-4xl">
          Saved &amp; Tracked
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
          Your bookmarks, favourites, watchlist, recently viewed properties and
          comparison set — synced locally to this device.
        </p>
      </header>

      {/* Tabs */}
      <div className="dashboard-glass sticky top-20 z-30 mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5 dashboard-scroll">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors duration-200 ease-lux ${
              tab === t.id
                ? "bg-accent/15 text-accent"
                : "text-white/55 hover:text-white"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-[0.6rem] ${
                tab === t.id ? "bg-accent/25 text-accent" : "bg-white/[0.06] text-white/40"
              }`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_LUX }}
      >
        {tab !== "compare" && (
          <GridForTab
            tab={tab}
            properties={
              tab === "bookmarks"
                ? bookmarks
                : tab === "favorites"
                  ? favorites
                  : tab === "watchlist"
                    ? watchlist
                    : recent
            }
            collections={collections}
          />
        )}

        {tab === "compare" && (
          <CompareTable
            properties={compare}
            onRemove={collections.removeFromComparison}
            onClear={collections.clearComparison}
          />
        )}
      </motion.div>
    </div>
  );
}

function GridForTab({
  tab,
  properties,
  collections,
}: {
  tab: Tab;
  properties: MarketplaceProperty[];
  collections: ReturnType<typeof useCollections>;
}) {
  if (properties.length === 0) {
    const label =
      tab === "bookmarks"
        ? "No bookmarks yet"
        : tab === "favorites"
          ? "No favourites yet"
          : tab === "watchlist"
            ? "No watched properties"
            : "Nothing viewed recently";
    return (
      <EmptyStateWrap title={label} />
    );
  }
  return (
    <MarketplaceGrid
      properties={properties}
      isBookmarked={collections.isBookmarked}
      onToggleBookmark={collections.toggleBookmark}
      isFavourite={collections.isFavourite}
      onToggleFavorite={collections.toggleFavorite}
      isComparing={collections.isComparing}
      onToggleCompare={collections.addToComparison}
    />
  );
}

function EmptyStateWrap({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 text-center">
      <h3 className="font-display text-xl font-light text-white/90">{title}</h3>
      <p className="mt-2 text-sm text-white/45">
        Browse the marketplace and use the bookmark, favourite or watch controls
        to build your collection.
      </p>
      <Link
        href="/marketplace"
        className="dashboard-btn dashboard-btn-primary mt-6 !px-5 !py-2.5 !text-xs"
      >
        Go to Marketplace
      </Link>
    </div>
  );
}

function CompareTable({
  properties,
  onRemove,
  onClear,
}: {
  properties: MarketplaceProperty[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (properties.length === 0) {
    return (
      <EmptyStateWrap title="Comparison list is empty" />
    );
  }

  const rows: { label: string; render: (p: MarketplaceProperty) => React.ReactNode }[] = [
    { label: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { label: "Type", render: (p) => ASSET_LABEL[p.assetType] },
    { label: "Location", render: (p) => `${p.city}, ${p.country}` },
    { label: "Price / Fraction", render: (p) => formatCurrency(p.tokenPrice) },
    { label: "Target Raise", render: (p) => formatCompactCurrency(p.targetRaise) },
    { label: "Funding", render: (p) => formatPercent(p.fundingProgress * 100, 0) },
    { label: "Expected ROI", render: (p) => formatPercent(p.expectedRoi) },
    { label: "Rental Yield", render: (p) => formatPercent(p.rentalYield) },
    { label: "Min Investment", render: (p) => formatCurrency(p.minInvestment) },
    { label: "Available", render: (p) => p.availableFractions.toLocaleString("en-US") },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="dashboard-label">
          {properties.length} / 4 properties
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition-colors hover:text-white"
        >
          Clear all
        </button>
      </div>
      <div className="overflow-x-auto dashboard-scroll">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg-base/80 p-3 text-left align-bottom">
                <span className="dashboard-label">Metric</span>
              </th>
              {properties.map((p) => (
                <th key={p.id} className="min-w-[180px] border-l border-white/[0.06] p-3 text-left align-bottom">
                  <div className="font-display text-base font-light text-white/90">
                    {p.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    className="mt-1 text-[0.65rem] text-white/40 transition-colors hover:text-red-300"
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/[0.05]">
                <td className="sticky left-0 z-10 bg-bg-base/80 p-3 text-white/45">
                  {row.label}
                </td>
                {properties.map((p) => (
                  <td
                    key={p.id}
                    className="border-l border-white/[0.06] p-3 tabular-nums text-white/85"
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-white/[0.05]">
              <td className="sticky left-0 z-10 bg-bg-base/80 p-3" />
              {properties.map((p) => (
                <td key={p.id} className="border-l border-white/[0.06] p-3">
                  <Link
                    href={`/marketplace/${p.slug}`}
                    className="dashboard-btn dashboard-btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    View
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
