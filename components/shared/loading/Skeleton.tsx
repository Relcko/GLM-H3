"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg bg-white/[0.04] animate-pulse", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm", className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Pulse className="h-2.5 w-16" />
          <Pulse className="h-2 w-2 rounded-full" />
        </div>
        <Pulse className="h-7 w-36" />
        <Pulse className="h-2.5 w-48" />
        <div className="flex gap-2 pt-1">
          <Pulse className="h-1.5 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
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
    <div className={cn("rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 backdrop-blur-sm", className)}>
      <Pulse className="mb-2 h-2 w-14" />
      <Pulse className="h-6 w-24" />
      <Pulse className="mt-1.5 h-1.5 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-white/[0.06] pb-3">
        <Pulse className="h-3 w-20" />
        <Pulse className="h-3 w-14" />
        <Pulse className="h-3 w-14" />
        <Pulse className="ml-auto h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ cards = 5 }: { cards?: number }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonMetric key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm", className)}>
      <div className="mb-4 flex items-center justify-between">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-3 w-12" />
      </div>
      <Pulse className="h-44 w-full rounded-lg" />
      <div className="mt-3 flex justify-between">
        <Pulse className="h-2 w-16" />
        <Pulse className="h-2 w-12" />
        <Pulse className="h-2 w-16" />
      </div>
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

interface PageLoadingProps {
  className?: string;
  children?: ReactNode;
}

export function PageLoading({ className, children }: PageLoadingProps) {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center", className)}>
      {children || (
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      )}
    </div>
  );
}

export function SectionLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-xs text-white/40">Loading...</span>
      </div>
    </div>
  );
}
