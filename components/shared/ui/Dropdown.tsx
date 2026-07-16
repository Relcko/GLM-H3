"use client";

import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/shared/cn";

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[180px] rounded-xl border border-white/[0.08] bg-bg-secondary py-1 shadow-xl backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setOpen(false);
                }
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                item.variant === "danger"
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-white/70 hover:bg-white/[0.04] hover:text-white",
                item.disabled && "opacity-40 pointer-events-none"
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
