"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import { MarketplaceFilters } from "./MarketplaceFilters";
import type { MarketplaceFiltersProps } from "./MarketplaceFilters";

export function MarketplaceSidebar({
  open,
  onClose,
  ...filters
}: MarketplaceFiltersProps & { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="dashboard-glass dashboard-scroll sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl">
          <MarketplaceFilters {...filters} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_LUX }}
              onClick={onClose}
              aria-hidden="true"
              className="fixed inset-0 z-[158] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: EASE_LUX }}
              className="fixed inset-y-0 left-0 z-[159] w-[85vw] max-w-sm lg:hidden"
            >
              <div className="dashboard-glass flex h-full flex-col overflow-y-auto dashboard-scroll">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <span className="font-display text-base text-white/90">
                    Refine
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close filters"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:text-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <MarketplaceFilters {...filters} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
