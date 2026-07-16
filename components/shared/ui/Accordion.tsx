"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/shared/cn";

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("divide-y divide-white/[0.06]", className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-white/80 hover:text-white transition-colors"
              aria-expanded={isOpen}
            >
              {item.title}
              <svg
                className={cn("h-4 w-4 text-white/30 transition-transform duration-200", isOpen && "rotate-180")}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && <div className="pb-3 text-sm text-white/50">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
