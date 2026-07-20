"use client";

import { motion } from "framer-motion";

function SkeletonCard() {
  return (
    <div className="dashboard-card overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/[0.03]">
        <div className="loader-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-white/[0.05]" />
          <div className="h-3 w-24 rounded bg-white/[0.04]" />
        </div>
        <div className="h-5 w-3/4 rounded bg-white/[0.06]" />
        <div className="h-3 w-full rounded bg-white/[0.03]" />
        <div className="h-3 w-5/6 rounded bg-white/[0.03]" />
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.02] p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.04]" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ count = 9 }: { count?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </motion.div>
  );
}
