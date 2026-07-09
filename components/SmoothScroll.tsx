"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/motion";
import { getScrollStore } from "@/lib/scroll";

/**
 * Lenis smooth scroll provider — Phase 2.
 *
 * The store owns the ONE rAF. This component only creates the Lenis
 * instance and hands it to the store via `attachLenis()`. The store's
 * tick then calls `lenis.raf(time)` and reads Lenis's smoothed scroll
 * value — so scroll physics, camera, atmosphere, lighting and UI all
 * share a single clock and a single smoothed source of truth.
 *
 * Tuned for a heavier, deliberate "cinema camera" feel:
 * - duration + custom easing (slow attack → glide → long quartic settle)
 * - Lower wheel multiplier for finer, weighted control on desktop
 * - Disabled on reduced-motion and coarse pointer (touch uses native)
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({
      duration: 1.6,
      easing: cinematicEase,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      overscroll: false,
      autoRaf: false,
    });

    // Hand the instance to the shared scroll store. The store's rAF
    // (already running) will drive lenis.raf() every frame — we do NOT
    // run a second rAF here. One clock for the entire experience.
    const store = getScrollStore();
    store.attachLenis(lenis);

    // Keep anchors (ChapterRail links) flowing through Lenis for a
    // smooth, in-sync programmatic scroll instead of an instant jump.
    const onAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: 0, duration: 1.8 });
    };
    document.addEventListener("click", onAnchorClick, { passive: false });

    // Recalculate after the loader reveals content (layout may shift).
    const refresh = () => lenis.resize();
    const t1 = setTimeout(refresh, 700);
    const t2 = setTimeout(refresh, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener("click", onAnchorClick);
      store.detachLenis();
      lenis.destroy();
    };
  }, []);

  return null;
}

/**
 * Cinematic ease — Phase 2.
 *
 * A piecewise curve with three regions:
 *   0..0.15  — slow attack (t^4). Wheel starts but momentum is small.
 *   0.15..0.5 — glide. Linear-ish middle, gives a sense of weight.
 *   0.5..1.0 — long, soft quartic ease-out. The "camera settles" tail,
 *              lasting a beat longer than expected — perfect for an
 *              uninterrupted, narrative flow between chapters.
 */
function cinematicEase(t: number): number {
  if (t < 0.15) {
    const u = t / 0.15;
    return u * u * u * u * 0.1;
  }
  if (t < 0.5) {
    const u = (t - 0.15) / 0.35;
    return 0.1 + u * 0.34;
  }
  const u = (t - 0.5) / 0.5;
  return 0.44 + (1 - Math.pow(1 - u, 4)) * 0.56;
}
