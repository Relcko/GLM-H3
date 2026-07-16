"use client";

import { type ReactNode, useState, useRef } from "react";
import { cn } from "@/lib/shared/cn";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const positionStyles: Record<TooltipPosition, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowStyles: Record<TooltipPosition, string> = {
  top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-white/[0.08] border-b-transparent",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-white/[0.08] border-t-transparent",
  left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-white/[0.08] border-r-transparent",
  right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-white/[0.08] border-l-transparent",
};

export function Tooltip({ content, children, position = "top", delay = 300, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => { timerRef.current = setTimeout(() => setVisible(true), delay); }}
      onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); setVisible(false); }}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={cn("absolute z-40 pointer-events-none", positionStyles[position])}>
          <div className="rounded-lg border border-white/[0.08] bg-bg-secondary px-2.5 py-1.5 text-xs text-white/80 shadow-xl backdrop-blur-xl whitespace-nowrap">
            {content}
          </div>
          <div className={cn("absolute w-0 h-0 border-4", arrowStyles[position])} />
        </div>
      )}
    </div>
  );
}
