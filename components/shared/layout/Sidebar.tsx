"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/shared/cn";
import type { NavItem } from "@/lib/shared/types";

interface SidebarProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (item: NavItem) => void;
  header?: ReactNode;
  footer?: ReactNode;
  width?: string;
  className?: string;
}

export function Sidebar({ items, activeId, onNavigate, header, footer, width = "w-60", className }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {header && <div className="px-4 pb-6">{header}</div>}
      <nav className="flex-1 space-y-1 px-3" aria-label="Sidebar navigation">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate?.(item);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
                isActive
                  ? "border border-accent/20 bg-accent/[0.08] text-accent"
                  : "border border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/75"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon && <span className={cn("shrink-0", isActive ? "text-accent" : "text-white/30")}>{item.icon}</span>}
              <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {footer && <div className="border-t border-white/[0.06] px-4 py-4">{footer}</div>}
    </div>
  );

  return (
    <>
      <aside
        className={cn("fixed left-0 top-0 z-40 hidden h-full border-r border-white/[0.05] bg-bg-base/80 backdrop-blur-2xl lg:flex", width, className)}
        aria-label="Sidebar navigation"
      >
        {sidebarContent}
      </aside>

      <button
        onClick={() => setOpen(!open)}
        className="fixed left-3 top-[4.5rem] z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-bg-base/80 backdrop-blur-xl lg:hidden"
        aria-label="Toggle sidebar"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-[5px]">
          <span className={cn("h-px w-4 origin-center bg-white transition-all", open && "translate-y-[3px] rotate-45")} />
          <span className={cn("h-px w-4 origin-center bg-white transition-all", open && "-translate-y-[3px] -rotate-45")} />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[155] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            className={cn("fixed left-0 top-0 z-[156] flex h-full border-r border-white/[0.08] bg-bg-base/95 backdrop-blur-2xl lg:hidden", width)}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
