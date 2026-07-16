"use client";

import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

export function EmptyState({
  variant,
  resultCount,
  totalCount,
  onRetry,
  onResetFilters,
}: {
  variant: "empty" | "error" | "no-results";
  resultCount?: number;
  totalCount?: number;
  onRetry?: () => void;
  onResetFilters?: () => void;
}) {
  const isError = variant === "error";
  const isNoResults = variant === "no-results";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_LUX }}
      className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 text-center"
    >
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
          isError
            ? "border-red-400/25 bg-red-500/10 text-red-300"
            : "border-accent/25 bg-accent/10 text-accent"
        }`}
      >
        {isError ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <h3 className="font-display text-xl font-light text-white/90">
        {isError
          ? "Couldn’t load the marketplace"
          : isNoResults
            ? "No properties match your filters"
            : "No properties yet"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/45">
        {isError
          ? "Something went wrong while fetching listings. Please try again."
          : isNoResults
            ? `We found ${resultCount ?? 0} of ${totalCount ?? 0} properties with the current search and filters.`
            : "Listings will appear here once properties are published."}
      </p>

      <div className="mt-6 flex items-center gap-3">
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="dashboard-btn dashboard-btn-primary !px-5 !py-2.5 !text-xs"
          >
            Try again
          </button>
        )}
        {isNoResults && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="dashboard-btn dashboard-btn-primary !px-5 !py-2.5 !text-xs"
          >
            Clear filters
          </button>
        )}
      </div>
    </motion.div>
  );
}
