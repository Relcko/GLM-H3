"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { getScrollStore } from "@/lib/scroll";
import { getDirector } from "@/lib/director";
import { damp, smootherstep, HERO } from "@/lib/motion";

/**
 * Cinematic atmosphere — Phase 2.
 *
 * A field of large blurred color orbs between the canvas and the content.
 * They create a sense of layered depth and atmospheric light that evolves
 * as you scroll.
 *
 * Phase 2 upgrades:
 *   - A hero "sun" orb tracks the camera across the sky (left→right,
 *     arcing up in the middle) and shifts hue cool→gold across the
 *     journey — mirrors the SectionLight arc for a unified mood.
 *   - Stronger per-orb depth parallax (close orbs react more to scroll
 *     and velocity; far orbs barely move).
 *   - dt-based drift (identical on 60/120/144Hz).
 *   - Scroll-direction drift: orbs slide opposite the camera, giving a
 *     parallax sense of "the world passing the lens".
 */

type Orb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseR: number;
  phase: number;
  baseColor: [number, number, number];
  alpha: number;
  speed: number;
  depth: number; // 0 = far, 1 = close
  hueShift: number;
};

const ORB_COLORS: [number, number, number][] = [
  [0, 212, 255],   // accent cyan
  [0, 87, 255],    // accent blue
  [214, 178, 94],  // gold
  [60, 227, 125],  // success green
  [120, 180, 255], // soft blue
  [255, 178, 90],  // warm amber
];

export default function CinematicAtmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = (canvas.width = window.innerWidth * dpr);
    let h = (canvas.height = window.innerHeight * dpr);

    const initOrbs = () => {
      const N = window.innerWidth < 768 ? 5 : 8;
      const list: Orb[] = [];
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 + Math.random() * 0.4;
        const r = Math.min(w, h) * (0.22 + Math.random() * 0.22);
        const depth = Math.random();
        list.push({
          x: w * 0.5 + Math.cos(angle) * r * 0.6,
          y: h * 0.5 + Math.sin(angle) * r * 0.5,
          vx: (Math.random() - 0.5) * 0.18 * dpr,
          vy: (Math.random() - 0.5) * 0.14 * dpr,
          baseR: (Math.min(w, h) * (0.28 + Math.random() * 0.22)) * 0.5,
          phase: Math.random() * Math.PI * 2,
          baseColor: ORB_COLORS[i % ORB_COLORS.length],
          alpha: 0.16 + Math.random() * 0.14,
          speed: 0.18 + Math.random() * 0.28,
          depth,
          hueShift: (i / N) * Math.PI * 2,
        });
      }
      orbsRef.current = list;
    };
    initOrbs();

    const onResize = () => {
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      initOrbs();
    };
    window.addEventListener("resize", onResize);

    const store = getScrollStore();
    let raf = 0;
    let lastT = performance.now();
    const start = performance.now();
    // Director-gated opacity: atmosphere fades in with the environment track.
    let atmOpacity = 0;

    // Smoothed "sun" position (dt-damped) for buttery travel.
    let sunX = w * 0.2, sunY = h * 0.3;

    const tick = (now: number) => {
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;
      const t = (now - start) / 1000;
      const v = store.getVelocity();
      const p = store.getProgress();

      // Director-gated reveal: fade the orb field in once the environment
      // track is live (Stage >= 3). Reuses this rAF; no second loop.
      const targetAtm = getDirector().trackProgress("hero", "environment") * HERO.ATMOSPHERE_OPACITY;
      atmOpacity = damp(atmOpacity, targetAtm, HERO.LAYER_RAMP, dt);
      if (canvas.style.opacity !== atmOpacity.toFixed(3)) {
        canvas.style.opacity = atmOpacity.toFixed(3);
      }
      const smooth = store.getSmooth();
      const camera = store.getCamera();

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // --- Hero "sun" orb: tracks the camera across the sky. ---------
      // Position: left→right across the journey, arcing up mid-page.
      const sunTx = w * (0.18 + smooth * 0.64);
      const sunTy = h * (0.32 - Math.sin(smooth * Math.PI) * 0.12);
      sunX = damp(sunX, sunTx, 5, dt);
      sunY = damp(sunY, sunTy, 5, dt);
      // Hue: cool cyan (start) → warm gold (finale) across the journey.
      const journey = smootherstep(smooth);
      const sr = 0 + journey * 245;            // 0 → 245
      const sg = 212 - journey * 34;           // 212 → 178
      const sb = 255 - journey * 79;           // 255 → 176
      const sunR = Math.min(w, h) * 0.42 * (1 + v * 0.18);
      const sunAlpha = 0.16 + v * 0.05;
      const sg1 = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
      sg1.addColorStop(0, `rgba(${sr | 0},${sg | 0},${sb | 0},${sunAlpha})`);
      sg1.addColorStop(0.45, `rgba(${sr | 0},${sg | 0},${sb | 0},${sunAlpha * 0.3})`);
      sg1.addColorStop(1, `rgba(${sr | 0},${sg | 0},${sb | 0},0)`);
      ctx.fillStyle = sg1;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // --- Drifting orb field --------------------------------------
      for (const orb of orbsRef.current) {
        // dt-based drift (the *60 keeps the original 60fps feel).
        const speedBoost = 1 + v * 4 * orb.depth;
        orb.x += orb.vx * dt * 60 * speedBoost;
        orb.y += orb.vy * dt * 60 * speedBoost;

        // Wrap
        if (orb.x < -orb.baseR * 2) orb.x = w + orb.baseR * 2;
        if (orb.x > w + orb.baseR * 2) orb.x = -orb.baseR * 2;
        if (orb.y < -orb.baseR * 2) orb.y = h + orb.baseR * 2;
        if (orb.y > h + orb.baseR * 2) orb.y = -orb.baseR * 2;

        // Camera parallax: close orbs slide opposite the camera,
        // far orbs barely move — the world passing the lens.
        const dirX = camera * 46 * dpr * orb.depth;
        const dirY = camera * 36 * dpr * orb.depth;
        const wind = Math.sin(t * 0.13 + orb.phase) * 6 * dpr * orb.depth;

        const breathe = Math.sin(t * orb.speed + orb.phase) * 0.07;
        const r = orb.baseR * (1 + breathe);
        const vScale = 1 + v * 0.35 * orb.depth;
        const r2 = r * vScale;

        // Hue rotation across the journey (subtle — keeps identity).
        const rot = smooth * Math.PI * 0.4 + orb.hueShift;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const [cr, cg, cb] = orb.baseColor;
        const r0 = cr * cosR - cg * sinR * 0.3;
        const g0 = cr * sinR * 0.3 + cg;
        const b0 = cb + (cr - cb) * Math.sin(rot) * 0.1;
        const cr2 = Math.max(0, Math.min(255, r0));
        const cg2 = Math.max(0, Math.min(255, g0));
        const cb2 = Math.max(0, Math.min(255, b0));

        const x = orb.x + dirX;
        const y = orb.y + dirY + wind;

        const g = ctx.createRadialGradient(x, y, 0, x, y, r2);
        g.addColorStop(0, `rgba(${cr2 | 0},${cg2 | 0},${cb2 | 0},${orb.alpha})`);
        g.addColorStop(0.4, `rgba(${cr2 | 0},${cg2 | 0},${cb2 | 0},${orb.alpha * 0.4})`);
        g.addColorStop(1, `rgba(${cr2 | 0},${cg2 | 0},${cb2 | 0},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r2, 0, Math.PI * 2);
        ctx.fill();
      }

      // p kept for future use (camera-driven field shifts)
      void p;

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="gpu pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: Z.atmosphere, mixBlendMode: "screen", opacity: 0 }}
    />
  );
}
