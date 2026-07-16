"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import type { FaqItem } from "@/marketplace/domain";

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
            >
              <span className="text-sm font-medium text-white/90">{item.question}</span>
              <span
                className={`shrink-0 text-accent transition-transform duration-300 ease-lux ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_LUX }}
                >
                  <p className="px-4 pb-4 text-sm leading-relaxed text-white/55">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
