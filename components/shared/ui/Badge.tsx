"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent" | "gold";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/[0.06] text-white/60 border border-white/[0.06]",
  success: "bg-green-500/10 text-green-400 border border-green-500/15",
  warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/15",
  danger: "bg-red-500/10 text-red-400 border border-red-500/15",
  info: "bg-blue-500/10 text-blue-400 border border-blue-500/15",
  accent: "bg-accent/10 text-accent border border-accent/20",
  gold: "bg-gold/10 text-gold border border-gold/20",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

export function Badge({ variant = "default", size = "md", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
