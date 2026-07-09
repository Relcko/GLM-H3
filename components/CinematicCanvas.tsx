"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFrameSequence, TOTAL_FRAMES } from "@/lib/frames";
import { getScrollStore } from "@/lib/scroll";
import { Z } from "@/lib/tokens";
import { damp, EASE_LUX } from "@/lib/motion";

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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Reduced motion: paint a static mid-frame and skip the rAF loop
    // entirely. The building is still visible; no scroll-driven motion.
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
      // Repaint once the needed frame loads.
      const seq = getFrameSequence();
      const off = seq.onProgress((n) => {
        if (n >= 1) paintStatic();
        if (n >= 12) { paintStatic(); }
      });
      return off;
    }

    const seq = getFrameSequence();
    const store = getScrollStore();
    const dpr = adaptiveDpr();

    let raf = 0;
    let running = true;
    let frameIndex = 0;            // damped frame index (camera, in frame space)
    let lastPainted = -1;
    const mouse = { x: 0, y: 0 };
    let mouseSx = 0, mouseSy = 0;
    let parallaxTick = 0;
    let lastT = performance.now();
    const start = performance.now();

    // Mouse parallax (decoupled from frame paint)
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // Two offscreen canvases for correct motion blur:
    //   scene = the clean current frame (cross-fade of A/B + vignette)
    //   prev  = the clean previous frame, blended under at high velocity
    const scene = document.createElement("canvas");
    scene.width = canvas.width;
    scene.height = canvas.height;
    const sctx = scene.getContext("2d", { alpha: false });
    if (!sctx) return;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";

    const prev = document.createElement("canvas");
    prev.width = canvas.width;
    prev.height = canvas.height;
    const pctx = prev.getContext("2d", { alpha: false });
    if (!pctx) return;
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = "high";
    // Seed prev with bg so the first blurred frame doesn't flash.
    pctx.fillStyle = "#050505";
    pctx.fillRect(0, 0, prev.width, prev.height);

    // Bloom offscreen — a small (1/4 res) buffer for a cheap soft-bloom
    // pass. The scene is drawn here scaled down, blurred, and composited
    // back with "lighter" at low alpha — a premium glow on highlights
    // without an expensive full-res blur.
    const bloomScale = 0.25;
    const bloom = document.createElement("canvas");
    bloom.width = Math.max(2, Math.floor(canvas.width * bloomScale));
    bloom.height = Math.max(2, Math.floor(canvas.height * bloomScale));
    const bctx = bloom.getContext("2d");
    if (!bctx) return;
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = "high";

    const drawFrame = (
      im: HTMLImageElement,
      alpha: number,
      c: CanvasRenderingContext2D,
      offX: number,
      offY: number,
      scale: number
    ) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = im.naturalWidth || im.width;
      const ih = im.naturalHeight || im.height;
      if (!iw || !ih) return;
      const s = Math.max(cw / iw, ch / ih) * 1.05 * scale;
      const dw = iw * s;
      const dh = ih * s;
      const ox = (cw - dw) / 2 + offX;
      const oy = (ch - dh) / 2 + offY;
      c.globalAlpha = alpha;
      c.drawImage(im, ox, oy, dw, dh);
      c.globalAlpha = 1;
    };

    const drawVignette = (c: CanvasRenderingContext2D) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const g = c.createRadialGradient(
        cw / 2,
        ch / 2,
        Math.min(cw, ch) * 0.35,
        cw / 2,
        ch / 2,
        Math.max(cw, ch) * 0.72
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.65, "rgba(0,0,0,0.18)");
      g.addColorStop(1, "rgba(0,0,0,0.45)");
      c.globalCompositeOperation = "multiply";
      c.fillStyle = g;
      c.fillRect(0, 0, cw, ch);
      c.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;
      const elapsed = (now - start) / 1000;
      const v = store.getVelocity();

      // Camera target in frame-index space. The store's camera is
      // already weighted + Lenis-smoothed; we add a LIGHT dt-damped
      // ease in frame space so the fractional frame index is stable
      // (no jitter on the cross-fade) while still trailing a hair —
      // that trailing is what reads as the camera "settling".
      const scrollTarget = store.getCamera() * (TOTAL_FRAMES - 1);
      frameIndex = damp(frameIndex, scrollTarget, 11, dt);

      // Mouse parallax — dt-damped, decoupled from the camera.
      mouseSx = damp(mouseSx, mouse.x, 8, dt);
      mouseSy = damp(mouseSy, mouse.y, 8, dt);

      // Idle drift — two superimposed sines for a non-mechanical motion.
      const idle = v < 0.025;
      const drift = idle
        ? Math.sin(elapsed * 0.18) * 0.1 + Math.sin(elapsed * 0.07 + 1.3) * 0.06
        : 0;
      const finalIndex = frameIndex + drift;

      const lo = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(finalIndex)));
      const hi = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.ceil(finalIndex)));
      const frac = finalIndex - lo;
      const dominant = Math.round(finalIndex);

      // Motion-blur alpha: only above a velocity threshold, finite.
      const ghostAlpha = v > 0.35 ? Math.min(0.4, (v - 0.35) * 0.8) : 0;

      // Repaint the parallax planes at low frequency even when idle
      // (keeps mouse parallax smooth without burning a full paint).
      const parallaxDrift = ++parallaxTick % 6 === 0;

      // Parallax offsets — X stronger, Y subtler (cinematic).
      const offX = mouseSx * 26 * dpr;
      const offY = mouseSy * 14 * dpr;

      // Camera dolly: scale-out on fast scroll (the "weight" of the
      // pan pushes the camera back), plus a faint idle depth-breathe.
      const scale = 1 - v * 0.014 + Math.sin(elapsed * 0.2) * 0.004;

      const wantPaint =
        dominant !== lastPainted ||
        Math.abs(scrollTarget - frameIndex) > 0.003 ||
        v > 0.35 ||
        parallaxDrift;

      if (wantPaint) {
        // 1) Paint the clean current scene offscreen.
        sctx.fillStyle = "#050505";
        sctx.fillRect(0, 0, canvas.width, canvas.height);
        const A = seq.get(lo);
        const B = seq.get(hi);
        if (A && B && lo !== hi) {
          // Always cross-fade between adjacent frames — every
          // transition is a true blend, never a hard cut.
          drawFrame(A, 1 - frac, sctx, offX, offY, scale);
          drawFrame(B, frac, sctx, offX, offY, scale);
        } else if (A) {
          drawFrame(A, 1, sctx, offX, offY, scale);
        } else if (B) {
          drawFrame(B, 1, sctx, offX, offY, scale);
        }
        drawVignette(sctx);

        // 2) Composite to the main canvas. On fast scroll, blend the
        //    clean previous frame under the new one for motion blur.
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (ghostAlpha > 0) {
          ctx.globalAlpha = 1;
          ctx.drawImage(prev, 0, 0);            // old frame (under)
          ctx.globalAlpha = 1 - ghostAlpha;     // new frame (over, slightly transparent)
          ctx.drawImage(scene, 0, 0);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 1;
          ctx.drawImage(scene, 0, 0);
        }

        // 3) Save the clean current scene for next frame's blur.
        pctx.fillStyle = "#050505";
        pctx.fillRect(0, 0, canvas.width, canvas.height);
        pctx.drawImage(scene, 0, 0);

        // 4) Soft bloom — cheap downsampled bright-pass glow.
        //    Draw the scene into the small bloom buffer, blur it, then
        //    composite back over the main canvas with "lighter" at a
        //    low, velocity-aware alpha. Brighter on slow scroll (the
        //    image breathes), eased off on fast scroll (no smearing).
        bctx.globalAlpha = 1;
        bctx.globalCompositeOperation = "source-over";
        bctx.fillStyle = "#050505";
        bctx.fillRect(0, 0, bloom.width, bloom.height);
        bctx.drawImage(scene, 0, 0, bloom.width, bloom.height);
        const bloomAlpha = Math.min(0.16, 0.12 * (1 - v * 0.6));
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = bloomAlpha;
        // Draw the tiny bloom buffer upscaled — the upscale itself yields
        // a free soft glow without an expensive per-frame canvas blur.
        // imageSmoothingQuality stays "high" on bctx for a clean upscale.
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(bloom, 0, 0, bloom.width, bloom.height, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        lastPainted = dominant;
      }

      // Stop rAF when truly still (no scroll, no mouse drift, loaded).
      if (
        Math.abs(scrollTarget - frameIndex) < 0.006 &&
        v < 0.02 &&
        seq.isDone &&
        !parallaxDrift &&
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
