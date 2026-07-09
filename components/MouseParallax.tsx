"use client";

import { useEffect } from "react";
import { damp } from "@/lib/motion";

/**
 * MouseParallax — Phase 4.
 *
 * Applies a subtle, frame-rate-independent translate to every element
 * marked with `data-parallax` (value = strength 0..1). The whole content
 * plane reads as floating in 3D — the camera isn't locked to the glass.
 *
 * Performance:
 *   - ONE rAF, shared by all parallax elements.
 *   - transform: translate3d only (GPU-composited, no layout/paint).
 *   - dt-damped (identical on 60/120/144Hz).
 *   - Element list is cached and refreshed every 2s (chapters mount
 *     lazily) — never queried per frame.
 *   - Pauses when the mouse hasn't moved for 2.5s and there's no scroll
 *     velocity; wakes on any motion. Zero cost when idle.
 *   - Respects reduced-motion (no transform).
 */
export default function MouseParallax() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    type Item = { el: HTMLElement; strength: number };
    let items: Item[] = [];
    const refresh = () => {
      const nodes = document.querySelectorAll<HTMLElement>("[data-parallax]");
      items = Array.from(nodes).map((el) => ({
        el,
        strength: Math.max(0, Math.min(1, Number(el.dataset.parallax) || 0.5)),
      }));
    };
    refresh();
    const refreshTimer = setInterval(refresh, 2000);

    // Smoothed mouse (0..1, -1..1 range centered at 0).
    let mx = 0, my = 0;
    let tx = 0, ty = 0;
    let lastMove = performance.now();
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      lastMove = performance.now();
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let lastT = performance.now();
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;

      // Damp mouse toward target — soft, premium trail.
      mx = damp(mx, tx, 6, dt);
      my = damp(my, ty, 6, dt);

      // Apply parallax: strength scales the pixel offset. Closer items
      // (higher strength) move more. Subtle — max ~14px on a 1080p screen.
      const maxOff = 14;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const ox = -mx * maxOff * it.strength;
        const oy = -my * maxOff * it.strength;
        it.el.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
      }

      // Idle pause: no mouse movement for 2.5s AND mouse settled.
      if (now - lastMove > 2500 && Math.abs(tx - mx) < 0.002 && Math.abs(ty - my) < 0.002) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wake = () => {
      if (!raf && running) {
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("mousemove", wake, { passive: true });

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (!running) {
        running = true;
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      clearInterval(refreshTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousemove", wake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
