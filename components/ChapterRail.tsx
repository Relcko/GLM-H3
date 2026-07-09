"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollProgress, useActiveChapterSync } from "@/lib/hooks";
import { EASE_LUX } from "@/lib/motion";
import { Z } from "@/lib/tokens";

const CHAPTERS = [
  { id: "chapter-01", num: "01", title: "Arrival" },
  { id: "chapter-02", num: "02", title: "Architecture" },
  { id: "chapter-03", num: "03", title: "Innovation" },
  { id: "chapter-04", num: "04", title: "Tokenization" },
  { id: "chapter-05", num: "05", title: "Investment" },
  { id: "chapter-06", num: "06", title: "Ecosystem" },
  { id: "chapter-07", num: "07", title: "Future" },
  { id: "chapter-08", num: "08", title: "Reveal" },
];

/**
 * Right-edge chapter rail.
 * - Vertical track with chapter numbers
 * - Fills as the user scrolls
 * - Active chapter glows + scales
 * - Hover shows a glass preview with chapter title
 */
export default function ChapterRail() {
  const ids = CHAPTERS.map((c) => c.id);
  const activeId = useActiveChapterSync(ids);
  const total = useScrollProgress();
  const [hover, setHover] = useState<string | null>(null);

  // Hide on mobile/tablet
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setShow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!show) return null;

  return (
    <nav
      aria-label="Chapters"
      className="fixed right-6 top-1/2 z-[145] -translate-y-1/2"
      style={{ zIndex: Z.floating + 5 }}
    >
      <div className="relative flex flex-col items-center gap-5">
        {/* Vertical track */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
        <motion.div
          className="absolute left-1/2 top-0 w-px -translate-x-1/2 origin-top bg-gradient-to-b from-accent to-accent-blue"
          style={{ scaleY: total }}
        />

        {CHAPTERS.map((c) => {
          const isActive = activeId === c.id;
          const isHover = hover === c.id;
          return (
            <a
              key={c.id}
              href={`#${c.id}`}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
              className="group relative flex h-6 items-center gap-3"
              aria-label={`Chapter ${c.num}: ${c.title}`}
            >
              {/* Number (fades on active) */}
              <span
                className={`font-mono text-[0.65rem] tabular-nums transition-all duration-500 ease-lux ${
                  isActive ? "text-accent" : "text-white/30"
                } ${isHover ? "text-white" : ""}`}
              >
                {c.num}
              </span>

              {/* Dot */}
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className={`absolute inset-0 rounded-full transition-all duration-500 ease-lux ${
                    isActive
                      ? "bg-accent scale-100 shadow-[0_0_5px_rgba(0,212,255,0.2)]"
                      : "bg-white/10 scale-75 group-hover:bg-white/25 group-hover:scale-100"
                  }`}
                />
                {isActive && (
                  <span className="absolute inset-[-4px] rounded-full border border-accent/20" />
                )}
              </span>

              {/* Hover preview */}
              <AnimatePresence>
                {isHover && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.25, ease: EASE_LUX }}
                    className="absolute right-full mr-3 whitespace-nowrap glass-strong rounded-full px-3 py-1.5 text-xs"
                  >
                    {c.title}
                  </motion.div>
                )}
              </AnimatePresence>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
