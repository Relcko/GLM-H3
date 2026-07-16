"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

export function PropertyGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const shots = images.length ? images : ["/marketplace/property-01.svg"];

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!lightbox) return;
    if (e.key === "Escape") setLightbox(false);
    if (e.key === "ArrowRight") setActive((i) => (i + 1) % shots.length);
    if (e.key === "ArrowLeft") setActive((i) => (i - 1 + shots.length) % shots.length);
  }, [lightbox, shots.length]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        aria-label="Open image gallery"
        className="group relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.06]"
      >
        <Image
          src={shots[active]}
          alt={`${name} — view ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover transition-transform duration-700 ease-lux group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base/50 via-transparent to-transparent" />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-3 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">
          {shots.length} photo{shots.length > 1 ? "s" : ""}
        </span>
      </button>

      {shots.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto dashboard-scroll pb-1">
          {shots.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-all duration-200 ease-lux ${
                i === active
                  ? "border-accent/50 opacity-100"
                  : "border-white/10 opacity-60 hover:opacity-90"
              }`}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_LUX }}
            onClick={() => setLightbox(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery"
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close gallery"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="relative aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-2xl">
              <Image
                src={shots[active]}
                alt={`${name} — view ${active + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
