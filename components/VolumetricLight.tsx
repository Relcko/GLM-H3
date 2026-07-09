"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { getScrollStore } from "@/lib/scroll";
import { getDirector } from "@/lib/director";
import { damp, smootherstep, HERO } from "@/lib/motion";

/**
 * VolumetricLight — Phase 4.
 *
 * Subtle volumetric "god rays" that emanate from the same key-light
 * position SectionLight uses (left→right across the journey, arcing up
 * mid-page). Reads the shared scroll store's smoothed progress so the
 * shafts travel in lockstep with the key light and the dissolve pulse.
 *
 * Implementation: a fixed full-screen overlay with two layered conic
 * + radial gradients positioned at the key light, screen-blended at a
 * very low opacity (max ~6%). All values are dt-damped for buttery,
 * frame-rate-independent motion. Pauses its rAF when the tab is hidden.
 *
 * Performance: CSS gradients only (no canvas), one rAF, transform on a
 * single layer — negligible cost.
 */
export default function VolumetricLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const store = getScrollStore();
    let raf = 0;
    let running = true;
    let lastT = performance.now();

    // Stage 4: lighting rig initialized — signal the Director.
    getDirector().markReady("lighting-ready");

    // Director-gated intensity: god-rays appear with the lighting track.
    let volAlpha = 0;

    // dt-damped position (matches SectionLight's key-light arc).
    let curX = 30, curY = 42;
    let curA = 0;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;

      const smooth = store.getSmooth();
      const v = store.getVelocity();

      // Same arc as SectionLight's key light.
      const tx = 28 + smooth * 44;
      const ty = 44 - Math.sin(smooth * Math.PI) * 8;
      // Intensity: gentle baseline + a hair of exposure on scroll.
      // Kept very low so the shafts read as atmosphere, not a VFX sweep.
      const ta = Math.min(0.04, 0.028 + v * 0.014);

      // Fade the whole layer in with the Director lighting track.
      const targetVol = getDirector().trackProgress("hero", "lighting");
      volAlpha = damp(volAlpha, targetVol, HERO.LAYER_RAMP, dt);

      curX = damp(curX, tx, 5, dt);
      curY = damp(curY, ty, 5, dt);
      curA = damp(curA, ta * volAlpha, 4, dt);

      // Continuous mood: god-rays drift from cool white to a faint warm
      // near the finale (clean futuristic white). Subtle, journey-driven.
      const mood = smootherstep(store.getCamera());
      const hr = Math.round(255 - mood * 18);
      const hg = Math.round(255 - mood * 4);
      const hb = Math.round(255 - mood * 36);

      if (ref.current) {
        // Two soft shafts: a wide radial halo + a narrow conic ray fan
        // from the key light. Both screen-blended.
        ref.current.style.opacity = curA.toFixed(3);
        ref.current.style.background = [
          // Wide soft halo at the light source
          `radial-gradient(ellipse 70% 90% at ${curX.toFixed(1)}% ${curY.toFixed(1)}%, rgba(${hr},${hg},${hb},0.5) 0%, rgba(${hr},${hg},${hb},0.08) 35%, transparent 70%)`,
          // Narrow god-ray fan (conic) emanating downward
          `conic-gradient(from 200deg at ${curX.toFixed(1)}% ${(curY - 4).toFixed(1)}%, transparent 0deg, rgba(${hr},${hg},${hb},0.18) 8deg, transparent 16deg, transparent 40deg, rgba(${hr},${hg},${hb},0.12) 48deg, transparent 56deg, transparent 360deg)`,
        ].join(", ");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

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
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="gpu pointer-events-none fixed inset-0"
      style={{
        zIndex: Z.volumetric,
        mixBlendMode: "screen",
        opacity: 0,
        willChange: "opacity, background",
      }}
    />
  );
}
