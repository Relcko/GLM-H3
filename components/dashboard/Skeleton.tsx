"use client";

import { motion } from "framer-motion";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-white/[0.04] ${className}`}
      animate={{ opacity: [0.25, 0.55, 0.25] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-2 w-2 rounded-full" />
        </div>
        <Pulse className="h-8 w-40" />
        <Pulse className="h-3 w-56" />
        <div className="flex gap-2 pt-2">
          <Pulse className="h-2 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Pulse className="h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-2 w-20" />
      </div>
      <Pulse className="h-3 w-16" />
      <Pulse className="h-3 w-12" />
    </div>
  );
}

export function SkeletonMetric({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 backdrop-blur-sm ${className}`}>
      <Pulse className="mb-2 h-3 w-16" />
      <Pulse className="h-7 w-28" />
      <Pulse className="mt-1 h-2 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 border-b border-white/[0.06] pb-3">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-16" />
        <Pulse className="ml-auto h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonMetric key={i} />
      ))}
    </div>
  );
}

export function SkeletonTimeline({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <Pulse className="h-5 w-5 rounded-full" />
            {i < items - 1 && <div className="mt-1 w-px flex-1 bg-white/[0.04]" />}
          </div>
          <div className="flex-1 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-40" />
            <Pulse className="h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
