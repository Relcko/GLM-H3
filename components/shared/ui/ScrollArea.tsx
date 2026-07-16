"use client";

import { cn } from "@/lib/shared/cn";
import type { ReactNode } from "react";

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <div className={cn("overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent", className)}>
      {children}
    </div>
  );
}
