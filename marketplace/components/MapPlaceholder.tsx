"use client";

import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import type { MarketplaceProperty } from "@/marketplace/types";
import { ASSET_LABEL, StatusBadge } from "./PropertyBadge";

/**
 * Decorative marketplace map placeholder. No external map provider — pins are
 * positioned deterministically from the property's id so the layout is stable.
 * Represents the future interactive global map surface.
 */
export function MapPlaceholder({ properties }: { properties: MarketplaceProperty[] }) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_30%_20%,rgba(71,194,255,0.06),transparent_55%)]">
      {/* faux graticule */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="dashboard-label">Global Map</span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] text-white/50">
          {properties.length} listings
        </span>
      </div>

      {properties.map((p, i) => {
        const x = 12 + ((i * 73) % 76);
        const y = 22 + ((i * 47) % 56);
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_LUX, delay: i * 0.03 }}
            className="group absolute"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`${p.name} — ${p.city}, ${p.country}`}
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
            </span>
            <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-bg-base/95 p-3 text-left shadow-xl group-hover:block">
              <StatusBadge status={p.status} />
              <div className="mt-1.5 text-xs font-medium text-white/90">{p.name}</div>
              <div className="text-[0.65rem] text-white/45">
                {p.city}, {p.country} · {ASSET_LABEL[p.assetType]}
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-bg-base/70 px-3 py-1 text-[0.6rem] text-white/40 backdrop-blur">
        Map preview
      </div>
    </div>
  );
}
