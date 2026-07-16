"use client";

import { cn } from "@/lib/shared/cn";

interface ProgressIndicatorProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const variantStyles = {
  default: "bg-accent",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-red-500",
};

export function ProgressIndicator({ value, max = 100, size = "md", variant = "accent", showLabel = false, className }: ProgressIndicatorProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-white/[0.06]", sizeStyles[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", variantStyles[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-right text-xs text-white/40">{Math.round(pct)}%</p>}
    </div>
  );
}
