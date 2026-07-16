"use client";

import { cn } from "@/lib/shared/cn";
import type { Breadcrumb } from "@/lib/shared/types";

interface BreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label + index} className="flex items-center gap-1.5">
              {index > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/20" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast || !item.href ? (
                <span className={cn(isLast ? "text-white/80" : "text-white/40")}>{item.label}</span>
              ) : (
                <a href={item.href} className="text-white/40 hover:text-white/70 transition-colors">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
