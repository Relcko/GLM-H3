"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { CHAPTERS } from "@/lib/chapters";
import { getScrollStore } from "@/lib/scroll";
import { damp, smootherstep } from "@/lib/motion";

/**
 * SectionTransition — Phase 2.
 *
 * A fixed full-screen overlay that creates a cinematic "shot transition"
 * as the user crosses a chapter boundary.
 *
 * Devices (all driven by the same cached chapter measurements that
 * SectionLight uses, so color and dissolve always agree):
 *   1. Radial darken — the screen "breathes" dimmer right at the seam.
 *   2. Letterbox — top/bottom bars ease in a few vh at the boundary,
 *      the classic "cut between shots" gesture. Eases back out in the
 *      calm middle of each chapter.
 *   3. Horizontal sweep line — brightens with scroll velocity, giving a
 *      sense of motion across the seam.
 *   4. Live chapter caption — subtly indicates the active chapter.
 *
 * All values are dt-damped for frame-rate-independent smoothness.
 */

const PULSE_WIDTH = 0.18; // pulse fades over the first/last 18% of each section

export default function SectionTransition() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const letterTopRef = useRef<HTMLDivElement>(null);
  const letterBottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const store = getScrollStore();
    let raf = 0;
    let running = true;

    // dt-damped display values.
    let curPulse = 0;        // eased boundary pulse 0..1
    let curSweep = 0;        // sweep line opacity (0 at rest, pulses with velocity)
    let curLH = 0;           // letterbox height (px)
    let lastT = performance.now();

    const update = () => {
      const now = performance.now();
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;

      const v = store.getVelocity();
      const states = store.getChapterStates();

      let minDist = 1;
      let activeChapter = CHAPTERS[0];
      let activeDist = Infinity;

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (s.dist < minDist) minDist = s.dist;
        if (s.centerDist < activeDist) {
          activeDist = s.centerDist;
          activeChapter = CHAPTERS[i];
        }
      }

      // Pulse: 1 at a boundary, 0 at PULSE_WIDTH away — then eased.
      const pulse = Math.max(0, 1 - minDist / PULSE_WIDTH);
      const eased = smootherstep(pulse);

      curPulse = damp(curPulse, eased, 14, dt);
      curSweep = damp(curSweep, Math.min(0.6, v * 1.5), 8, dt);

      // Letterbox: up to ~5vh at the seam. vh in px.
      const vhpx = window.innerHeight;
      const targetLH = curPulse * vhpx * 0.05;
      curLH = damp(curLH, targetLH, 12, dt);

      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(curPulse * 0.5);
      }
      if (sweepRef.current) {
        sweepRef.current.style.opacity = curSweep.toFixed(3);
        sweepRef.current.style.transform = `translateY(${
          (Math.sin(now * 0.0003) * 2).toFixed(2)
        }px)`;
      }
      if (letterTopRef.current) {
        letterTopRef.current.style.height = `${curLH.toFixed(1)}px`;
      }
      if (letterBottomRef.current) {
        letterBottomRef.current.style.height = `${curLH.toFixed(1)}px`;
      }
      if (activeRef.current) {
        activeRef.current.textContent = `${activeChapter.num} · ${activeChapter.title}`;
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
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: Z.transition }}
    >
      {/* Letterbox bars — ease in at chapter seams */}
      <div
        ref={letterTopRef}
        className="fixed left-0 right-0 top-0 bg-bg-base"
        style={{ height: 0, willChange: "height" }}
      />
      <div
        ref={letterBottomRef}
        className="fixed bottom-0 left-0 right-0 bg-bg-base"
        style={{ height: 0, willChange: "height" }}
      />

      {/* Radial darken pulse on chapter boundaries */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{
          opacity: 0,
          background:
            "radial-gradient(ellipse 90% 60% at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)",
          mixBlendMode: "multiply",
          willChange: "opacity",
        }}
      />
      {/* Sweep line — invisible at rest, brightens with scroll velocity */}
      <div
        ref={sweepRef}
        className="absolute left-0 right-0 top-1/2 h-px"
        style={{
          opacity: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          willChange: "transform, opacity",
        }}
      />
      {/* Live chapter indicator (very subtle, bottom-center) */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <span
          ref={activeRef}
          className="font-mono text-[0.6rem] uppercase tracking-[0.5em] text-white/30"
        >
          01 · Arrival
        </span>
      </div>
    </div>
  );
}
