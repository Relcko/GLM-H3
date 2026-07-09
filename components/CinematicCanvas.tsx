"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFrameSequence, TOTAL_FRAMES, getWorldSource } from "@/lib/frames";
import { getScrollStore } from "@/lib/scroll";
import { getDirector } from "@/lib/director";
import { computeCameraState, type RenderEnv } from "@/lib/render";
import { Z } from "@/lib/tokens";
import { damp, EASE_LUX, HERO, CAMERA } from "@/lib/motion";

/**
 * Scroll-driven cinematic canvas — Phase 2.
 *
 * The building is a 240-frame sequence; scroll scrubs through it.
 *
 * Phase 2 upgrades:
 *   - Frame-rate-independent damping (looks identical on 60/120/144Hz)
 *   - Reads the weighted, Lenis-synced camera from the shared store
 *     (single clock for the whole experience)
 *   - Correct motion-blur: a clean offscreen "prev" scene is blended
 *     under the new frame at velocity-scaled alpha — finite trail, no
 *     mushy accumulation
 *   - Camera dolly: subtle scale-out on velocity (the "weight" of a
 *     fast pan pushes the camera back) + idle depth-breathing
 *   - Vertical + horizontal mouse parallax with its own dt damping
 *   - Idle two-sine drift keeps the building alive when paused
 *   - Vignette baked into the frame (depth-of-field hint)
 *   - Smart idle: stops rAF when truly still, restarts on movement
 */

export default function CinematicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  // Adaptive canvas resize — debounced so a drag-resize doesn't
  // thrash the offscreen buffers (each resize allocates 3 canvases).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let timer: ReturnType<typeof setTimeout>;
    const fit = () => {
      const dpr = adaptiveDpr();
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    fit();
    // Stage 1: canvas element mounted and sized — signal the Director.
    getDirector().markReady("canvas-ready");
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(fit, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Preload frames (runs once on mount — no dependency on `ready` to avoid
  // re-entrant start() calls that can corrupt the FrameSequence pool).
  useEffect(() => {
    const seq = getFrameSequence();
    const off = seq.onProgress((n) => {
      setLoaded(n);
      if (n >= 30) setReady(true);
      if (n >= TOTAL_FRAMES) setReady(true);
    });
    seq.start();

    // Safety timeout: if the preload pool stalls or images fail silently,
    // force-complete after 8 seconds so the experience never stays stuck.
    const timeout = setTimeout(() => {
      if (seq.isDone) return;
      const loaded = seq.forceComplete();
      if (typeof console !== "undefined") {
        console.warn(
          `[Loader] Force-completed after timeout. ` +
          `${loaded}/${TOTAL_FRAMES} frames were loaded.`
        );
      }
      setLoaded(TOTAL_FRAMES);
      setReady(true);
    }, 8000);

    return () => {
      clearTimeout(timeout);
      off();
    };
  }, []);

  // Render loop — stateless compositor.
  // The renderer knows NOTHING about what a layer draws. Each frame it:
  //   1. builds a continuous CameraState from journeyProgress + velocity
  //   2. asks the WorldSource for Layer[]
  //   3. filters invisible layers, sorts by priority
  //   4. calls layer.render(ctx, env)
  //   5. disposes nothing per-frame (layers own their lifecycle)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Reduced motion: paint a static mid-frame and skip the rAF loop
    // entirely. The world is still visible; no scroll-driven motion.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const paintStatic = () => {
        const seq = getFrameSequence();
        const idx = Math.floor(TOTAL_FRAMES * 0.05); // near the entrance
        const im = seq.get(idx) || seq.nearest(idx)?.image || seq.get(0);
        if (!im) return;
        const cw = canvas.width, ch = canvas.height;
        const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
        if (!iw || !ih) return;
        const s = Math.max(cw / iw, ch / ih) * 1.05;
        const dw = iw * s, dh = ih * s;
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      };
      paintStatic();
      const seq = getFrameSequence();
      const off = seq.onProgress((n) => {
        if (n >= 1) paintStatic();
        if (n >= 12) paintStatic();
      });
      return off;
    }

    const store = getScrollStore();
    const world = getWorldSource();
    const dpr = adaptiveDpr();

    let raf = 0;
    let running = true;
    let canvasOpacity = getDirector().trackProgress("hero", "environment"); // 0 until world-ready
    let lastT = performance.now();
    const start = performance.now();

    // Mouse parallax — dt-damped, decoupled from the camera.
    const mouse = { x: 0, y: 0 };
    let mouseSx = 0, mouseSy = 0;
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;
      const time = (now - start) / 1000;
      const progress = store.getCamera(); // continuous journeyProgress 0..1
      const v = store.getVelocity();

      // Director opacity ramp: world materializes once first frame renders.
      const targetOpacity = getDirector().trackProgress("hero", "environment");
      canvasOpacity = damp(canvasOpacity, targetOpacity, HERO.LAYER_RAMP, dt);
      if (canvas.style.opacity !== canvasOpacity.toFixed(3)) {
        canvas.style.opacity = canvasOpacity.toFixed(3);
      }

      // Continuous camera — pure function of journeyProgress + velocity.
      // No chapter knowledge, no snapping; a chapter boundary is just
      // another progress value, so the shot is one uninterrupted move.
      const cam = computeCameraState({
        progress,
        velocity: v,
        dt,
        time,
        dpr,
        width: canvas.width,
        height: canvas.height,
      });
      // Mouse parallax added on top (decoupled from the camera gesture).
      mouseSx = damp(mouseSx, mouse.x, CAMERA.PARALLAX_LAMBDA, dt);
      mouseSy = damp(mouseSy, mouse.y, CAMERA.PARALLAX_LAMBDA, dt);
      cam.offX += mouseSx * CAMERA.PARALLAX_X * dpr;
      cam.offY += mouseSy * CAMERA.PARALLAX_Y * dpr;

      // Single rendering context for all layers.
      const env: RenderEnv = {
        progress,
        camera: cam,
        time,
        dt,
        dpr,
        width: canvas.width,
        height: canvas.height,
      };

      // Request → filter → sort → render. Renderer owns none of the drawing.
      const layers = world.getLayers(env);
      layers
        .filter((layer) => layer.visible(env))
        .sort((a, b) => a.priority - b.priority)
        .forEach((layer) => layer.render(ctx, env));

      // Idle stop: pause the rAF when truly still (no scroll, no mouse
      // drift, frames loaded) to save battery; wake on any input.
      if (
        v < 0.02 &&
        getFrameSequence().isDone &&
        Math.abs(mouseSx - mouse.x) < 0.0008 &&
        Math.abs(mouseSy - mouse.y) < 0.0008
      ) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Restart on any input after the loop went idle.
    const wake = () => {
      if (!raf && running) {
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("wheel", wake, { passive: true });
    window.addEventListener("touchstart", wake, { passive: true });

    // Visibility — pause when tab hidden.
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
      world.dispose?.();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("wheel", wake);
      window.removeEventListener("touchstart", wake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Initial paint of frame 0 once ready
  useEffect(() => {
    if (!ready) return;
    // Stage 2: first frame successfully rendered — signal the Director.
    getDirector().markReady("world-ready");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const seq = getFrameSequence();
    const first = seq.get(0);
    if (!first) {
      // If frame 0 isn't loaded yet (timeout or error), try nearest loaded.
      const fallback = seq.nearest(0);
      if (fallback) {
        const cw = canvas.width;
        const ch = canvas.height;
        const iw = fallback.image.naturalWidth || fallback.image.width;
        const ih = fallback.image.naturalHeight || fallback.image.height;
        if (iw && ih) {
          const scale = Math.max(cw / iw, ch / ih) * 1.05;
          const dw = iw * scale;
          const dh = ih * scale;
          ctx.fillStyle = "#050505";
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(fallback.image, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        }
      } else {
        // No frames loaded at all — paint a solid background so it's not
        // a white flash. The canvas rAF loop will paint when frames arrive.
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (typeof console !== "undefined") {
          console.warn("[CinematicCanvas] No frames available for initial paint.");
        }
      }
      return;
    }
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = first.naturalWidth;
    const ih = first.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * 1.05;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(first, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }, [ready]);

  const pct = Math.round((loaded / TOTAL_FRAMES) * 100);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="gpu fixed inset-0 h-full w-full"
        style={{ zIndex: Z.world, willChange: "transform" }}
      />
      <Loader pct={pct} ready={ready} />
    </>
  );
}

/** Adaptive DPR — caps by area so a 4K display doesn't render 4× pixels. */
function adaptiveDpr(): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  const area = window.innerWidth * window.innerHeight;
  const factor = Math.min(1, 1_200_000 / area);
  return Math.min(dpr, 1.5) * Math.max(0.85, factor);
}

function Loader({ pct, ready }: { pct: number; ready: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (ready) return;
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 900);
    return () => clearInterval(t);
  }, [ready]);

  const words = ["Calibrating camera", "Composing the building", "Ready"];
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          transition={{ duration: 1.2, ease: EASE_LUX }}
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-bg-base"
          role="status"
          aria-live="polite"
          aria-label={`Loading cinematic experience — ${pct}% complete`}
        >
          <motion.div
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 1, ease: EASE_LUX, delay: 0.1 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="font-display text-[0.7rem] uppercase tracking-[0.5em] text-white/40">
              Relcko
            </div>
            <div className="relative h-32 w-44 overflow-hidden">
              <svg viewBox="0 0 200 140" className="h-full w-full opacity-40">
                <path
                  d="M60 20 L60 120 L140 120 L140 50 L100 20 Z"
                  fill="none"
                  stroke="url(#g)"
                  strokeWidth="0.6"
                  className="loader-path"
                />
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor="#00D4FF" />
                    <stop offset="100%" stopColor="#0057FF" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="relative h-px w-56 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-blue to-accent"
                style={{
                  width: `${pct}%`,
                  transition: "width 250ms cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 0 8px rgba(0,212,255,0.4)",
                }}
              />
              {pct > 0 && pct < 100 && (
                <div
                  className="loader-shimmer absolute inset-y-0 w-1/4 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{ left: `${pct}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tracking-widest text-white/30">
                {pct.toString().padStart(3, "0")}%
              </span>
              <span className="text-white/15">·</span>
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-white/40">
                {words[phase]}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
