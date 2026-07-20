"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./primitives";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by name, city, or keyword…",
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handle(input: string) {
    setLocal(input);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChange(input), 250);
  }

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        role="searchbox"
        aria-label="Search marketplace"
        value={local}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (debounce.current) clearTimeout(debounce.current);
            onChange(local);
          }
        }}
        className="w-full rounded-full border border-white/12 bg-white/[0.04] py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/35 outline-none backdrop-blur transition focus:border-accent/40 focus:bg-white/[0.06]"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => handle("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
