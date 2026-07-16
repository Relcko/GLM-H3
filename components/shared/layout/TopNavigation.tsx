"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

interface TopNavigationProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
  transparent?: boolean;
  bordered?: boolean;
}

export function TopNavigation({ left, center, right, className, transparent = false, bordered = true }: TopNavigationProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 h-16",
        transparent
          ? "bg-transparent"
          : "border-b border-white/[0.05] bg-bg-base/80 backdrop-blur-2xl",
        className
      )}
    >
      <div className="mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">{left}</div>
        <div className="flex items-center gap-4">{center}</div>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
