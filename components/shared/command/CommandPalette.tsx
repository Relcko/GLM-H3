"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/shared/cn";
import type { CommandAction } from "@/lib/shared/types";
import { useKeyboardShortcut } from "@/lib/shared/hooks";

interface CommandPaletteProps {
  actions: CommandAction[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

export function CommandPalette({ actions, isOpen, onClose, placeholder = "Search commands..." }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut("k", onClose, { meta: true, enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setQuery("");
        setActiveIndex(0);
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    }
  }, [isOpen]);

  const filtered = query
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description?.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, activeIndex, onClose]
  );

  if (!isOpen) return null;

  const categories = [...new Set(filtered.map((a) => a.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-bg-secondary shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center border-b border-white/[0.06] px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-white/30" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-white/20"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/30">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-white/30">No commands found</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category}>
                {categories.length > 1 && (
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
                    {category}
                  </p>
                )}
                {filtered
                  .filter((a) => a.category === category)
                  .map((action, idx) => {
                    const globalIdx = filtered.indexOf(action);
                    return (
                      <button
                        key={action.id}
                        onClick={() => { action.action(); onClose(); }}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          globalIdx === activeIndex ? "bg-accent/[0.08] text-accent" : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                        )}
                      >
                        {action.icon && <span className="shrink-0">{action.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{action.label}</p>
                          {action.description && <p className="mt-0.5 text-xs text-white/30">{action.description}</p>}
                        </div>
                        {action.shortcut && (
                          <kbd className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/30">
                            {action.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
