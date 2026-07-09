"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { getScrollStore } from "@/lib/scroll";
import { getDirector } from "@/lib/director";
import { damp, HERO } from "@/lib/motion";

/**
 * Particles — Phase 2.
 *
 * Multi-layer depth particle field. Each layer has its own parallax rate
 * and color palette, so the eye reads real depth.
 *
 *   Layer 0 (back)  — tiny, slow, dim, soft — atmospheric "dust" (out of focus)
 *   Layer 1 (mid)   — small, medium — gentle drift
 *   Layer 2 (front) — larger, fast, bright, with a glow halo — "past the lens"
 *
 * Phase 2 upgrades:
 *   - Camera-driven parallax: particles slide opposite the camera's
 *     per-frame delta, so scrolling pushes the world past the lens
 *     (front layers react strongly, back barely).
 *   - Depth-of-field: back particles are drawn softer/larger/dimmer to
 *     read as out-of-focus dust.
 *   - dt-based motion (identical on 60/120/144Hz).
 *   - Mouse parallax (subtle, depth-weighted) + idle twinkle.
 */

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  r: number;
  a: number;
  layer: number;
  phase: number;
  hue: number;
};

export default function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = (canvas.width = window.innerWidth * dpr);
    let h = (canvas.height = window.innerHeight * dpr);

    const N = window.innerWidth < 768 ? 48 : 96;
    const ps: P[] = Array.from({ length: N }, () => {
      const r = Math.random();
      const layer = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
      const baseVy = -(Math.random() * 0.07 + 0.015 + layer * 0.04) * dpr;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (0.07 + layer * 0.06) * dpr,
        vy: baseVy,
        baseVy,
        r: (0.18 + layer * 0.6 + Math.random() * 0.7) * dpr,
        a: 0.05 + layer * 0.1 + Math.random() * 0.1,
        layer,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random(),
      };
    });

    // Stage 3: particle field initialized — signal the Director.
    getDirector().markReady("particles-ready");

    const mouse = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const store = getScrollStore();
    let raf = 0;
    let lastT = performance.now();
    let prevCamera = store.getCamera();
    const start = performance.now();
    let running = true;
    // Director-gated opacity: particles materialize at Stage >= 3.
    let partOpacity = 0;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;
      const t = (now - start) / 1000;
      const v = store.getVelocity();
      const camera = store.getCamera();

      // Director-gated reveal: particles fade in once initialized (Stage >= 3).
      const targetOpacity = getDirector().trackProgress("hero", "environment") * HERO.PARTICLES_OPACITY;
      partOpacity = damp(partOpacity, targetOpacity, HERO.LAYER_RAMP, dt);
      if (canvas.style.opacity !== partOpacity.toFixed(3)) {
        canvas.style.opacity = partOpacity.toFixed(3);
      }

      // Per-frame camera delta — drives true depth parallax.
      const dCam = camera - prevCamera;
      prevCamera = camera;
      const vhpx = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      for (const p0 of ps) {
        // Scroll velocity boost — front particles react stronger.
        const boost = v * 0.018 * dpr * (0.3 + p0.layer * 0.5);
        p0.vy += (p0.baseVy - boost - p0.vy) * (1 - Math.exp(-8 * dt));
        // dt-based horizontal drift
        p0.x += p0.vx * dt * 60;
        p0.y += p0.vy * dt * 60;

        // Camera parallax: slide opposite the camera delta.
        // Front layers move more (closer to the lens).
        const par = -dCam * vhpx * (0.15 + p0.layer * 0.5);
        p0.y += par;

        // Wrap
        if (p0.y < -4) {
          p0.y = h + 4;
          p0.x = Math.random() * w;
        }
        if (p0.y > h + 4) {
          p0.y = -4;
          p0.x = Math.random() * w;
        }
        if (p0.x < -4) p0.x = w + 4;
        if (p0.x > w + 4) p0.x = -4;

        // Mouse parallax offset (applied at render, not stored — prevents permanent drift)
        const mouseOffX = mouse.x * 0.4 * dpr * p0.layer * 0.18;

        // Subtle alpha twinkle on idle
        const twinkle = 1 + Math.sin(t * 1.6 + p0.phase) * 0.18;

        let color: string;
        let drawR = p0.r;
        if (p0.layer === 2) {
          // Front: accent cyan to white, brightest
          const r = 130 + p0.hue * 90;
          const g = 205 + p0.hue * 50;
          const b = 255;
          color = `rgba(${r | 0},${g | 0},${b | 0},${(p0.a * twinkle) * 1.1})`;
        } else if (p0.layer === 1) {
          // Mid: cool blue
          const r = 175 + p0.hue * 30;
          const g = 218;
          const b = 255;
          color = `rgba(${r | 0},${g | 0},${b | 0},${p0.a * twinkle})`;
        } else {
          // Back: out-of-focus dust — softer, larger, dimmer.
          const r = 210 + p0.hue * 25;
          const g = 228;
          const b = 255;
          drawR = p0.r * 1.8;
          color = `rgba(${r | 0},${g | 0},${b | 0},${p0.a * twinkle * 0.5})`;
        }

        const px = p0.x + mouseOffX;

        ctx.beginPath();
        ctx.arc(px, p0.y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Front particles get a tiny glow halo
        if (p0.layer === 2) {
          ctx.beginPath();
          ctx.arc(px, p0.y, p0.r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150,210,255,${p0.a * 0.18 * twinkle})`;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener("resize", onResize);

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
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="gpu pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: Z.particles, opacity: 0 }}
    />
  );
}
