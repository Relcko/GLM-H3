"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { CHAPTERS } from "@/lib/chapters";
import { getScrollStore } from "@/lib/scroll";
import { damp } from "@/lib/motion";

/**
 * SectionLight — Phase 2.
 *
 * A full-screen atmospheric lighting rig that evolves with the journey.
 * Each chapter defines a key color (lib/chapters.ts); the rig's color is
 * a smooth bell-weighted average of the surrounding chapters' colors.
 *
 * Phase 2 upgrades:
 *   - Moving key light: the source drifts across the frame as the user
 *     descends the page (left → right), like a sun tracking the camera.
 *   - Fill light: a cooler, dimmer source on the opposite side for depth.
 *   - Velocity flicker: the light brightens a hair on fast scroll —
 *     reads as exposure compensation, not a flash.
 *   - Reads the store's cached chapter states, so the light and the
 *     section dissolve pulse always react to the same viewport positions.
 *   - dt-damped intensity/position for buttery, frame-rate-independent
 *     transitions (no stepping on 120Hz).
 *
 * Cool cyan during "Arrival" → blue "Innovation" → green "Investment"
 * → warm gold "Reveal". Max ~12% opacity — a tint, never a flood.
 */

export default function SectionLight() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const store = getScrollStore();
    let raf = 0;
    let running = true;

    // Smoothed display values (dt-damped) so the light never steps.
    let curR = 0, curG = 0, curB = 0;
    let curA = 0;
    let curX = 30, curY = 42;       // key light position (%)
    let curFx = 70, curFy = 30;     // fill light position (%)

    let lastT = performance.now();

    const update = () => {
      const now = performance.now();
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;

      const v = store.getVelocity();
      const smooth = store.getSmooth();

      // Weighted color from cached chapter states (shared with SectionTransition).
      let totalWeight = 0;
      let r = 0, g = 0, b = 0;
      let maxIntensity = 0;
      const states = store.getChapterStates();
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const c = CHAPTERS[i];
        if (!c) continue;
        const w = s.weight * c.intensity;
        r += c.light[0] * w;
        g += c.light[1] * w;
        b += c.light[2] * w;
        totalWeight += w;
        maxIntensity = Math.max(maxIntensity, w);
      }

      if (totalWeight > 0) {
        const tr = r / totalWeight;
        const tg = g / totalWeight;
        const tb = b / totalWeight;
        // Intensity with a subtle velocity flicker (exposure compensation).
        const ta = Math.min(0.2, maxIntensity * 0.24 * (1 + v * 0.18));

        // Key light travels left→right across the journey and arcs up
        // in the middle (sun passing overhead). Fill light mirrors it.
        const tx = 28 + smooth * 44;
        const ty = 44 - Math.sin(smooth * Math.PI) * 8;
        const tfx = 96 - tx;        // opposite side
        const tfy = 26 + Math.sin(smooth * Math.PI) * 6;

        // Damp everything toward the target — frame-rate-independent.
        const lc = 9;               // color/position damping rate
        curR = damp(curR, tr, lc, dt);
        curG = damp(curG, tg, lc, dt);
        curB = damp(curB, tb, lc, dt);
        curA = damp(curA, ta, 6, dt);
        curX = damp(curX, tx, lc, dt);
        curY = damp(curY, ty, lc, dt);
        curFx = damp(curFx, tfx, lc, dt);
        curFy = damp(curFy, tfy, lc, dt);

        if (layerRef.current) {
          const cr = curR | 0, cg = curG | 0, cb = curB | 0;
          // Fill is a cooler, dimmer version of the key color.
          const fr = (cr * 0.7 + 60) | 0;
          const fg = (cg * 0.8 + 80) | 0;
          const fb = (cb * 0.85 + 90) | 0;
          const fa = curA * 0.45;
          layerRef.current.style.background = [
            // Key light
            `radial-gradient(ellipse 60% 55% at ${curX.toFixed(1)}% ${curY.toFixed(1)}%, rgba(${cr},${cg},${cb},${curA.toFixed(3)}) 0%, rgba(${cr},${cg},${cb},${(curA * 0.4).toFixed(3)}) 55%, transparent 92%)`,
            // Fill light (opposite, cooler, dimmer)
            `radial-gradient(ellipse 55% 50% at ${curFx.toFixed(1)}% ${curFy.toFixed(1)}%, rgba(${fr},${fg},${fb},${fa.toFixed(3)}) 0%, rgba(${fr},${fg},${fb},${(fa * 0.35).toFixed(3)}) 60%, transparent 95%)`,
          ].join(", ");
          layerRef.current.style.opacity = "1";
        }
      } else if (layerRef.current) {
        curA = damp(curA, 0, 4, dt);
        layerRef.current.style.opacity = String(curA);
      }
    };

    const tick = () => {
      if (!running) return;
      update();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="gpu pointer-events-none fixed inset-0"
      style={{
        zIndex: Z.light,
        mixBlendMode: "screen",
        opacity: 0,
        willChange: "background, opacity",
      }}
    />
  );
}
