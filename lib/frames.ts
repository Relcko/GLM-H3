"use client";

/**
 * Image sequence manager — Phase 5 optimized.
 *
 * Owns the 240-frame path convention, the preload pool,
 * and the "nearest loaded" resolver used by the canvas.
 *
 * Phase 5 optimizations:
 *   - Priority loading: the first PRIORITY_COUNT frames load with
 *     `fetchPriority="high"` + `decoding="sync"` so the loader reveals
 *     the scene the instant the user arrives. The rest load "async"
 *     with normal priority, keeping the network free for the page JS.
 *   - Lower concurrency for the tail (6 vs 12) to avoid saturating the
 *     browser's network queue — the first 30 frames now land faster.
 *
 * NOTE: Do NOT set loading="lazy" on off-DOM Image() preloads.
 * Browsers defer lazy off-DOM images indefinitely — onload/onerror
 * never fire, which permanently blocks the concurrency pool.
 *
 * Consumers should not import TOTAL_FRAMES from anywhere else.
 */

export const TOTAL_FRAMES = 240;
/** First N frames get high-priority loading (instant scene reveal). */
const PRIORITY_COUNT = 12;
const PAD = 3;
const PATH = (i: number) =>
  `/frames/ezgif-frame-${String(i + 1).padStart(PAD, "0")}.jpg`;

type LoadHandler = (loaded: number) => void;

export class FrameSequence {
  private images: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);
  private loaded = 0;
  private handlers = new Set<LoadHandler>();
  private inflight = 0;
  private next = 0;
  private done = false;

  constructor(
    private readonly priorityConcurrency = 6,
    private readonly tailConcurrency = 6
  ) {}

  start() {
    if (typeof window === "undefined") return;
    this.pump();
  }

  private get concurrency() {
    return this.next < PRIORITY_COUNT ? this.priorityConcurrency : this.tailConcurrency;
  }

  private pump() {
    while (this.inflight < this.concurrency && this.next < TOTAL_FRAMES) {
      const i = this.next++;
      this.inflight++;
      const im = new Image();
      const isPriority = i < PRIORITY_COUNT;
      im.decoding = isPriority ? "sync" : "async";
      // fetchPriority is a string attribute on HTMLImageElement.
      (im as HTMLImageElement & { fetchPriority?: string }).fetchPriority = isPriority ? "high" : "auto";
      im.src = PATH(i);
      im.onload = () => this.onOne(i, im);
      im.onerror = () => {
        if (typeof console !== "undefined") {
          console.warn(`[FrameSequence] Failed to load frame ${i + 1}: ${PATH(i)}`);
        }
        this.onOne(i, null);
      };
    }
  }

  private onOne(i: number, im: HTMLImageElement | null) {
    this.inflight--;
    if (im) this.images[i] = im;
    this.loaded++;
    for (const h of this.handlers) h(this.loaded);
    if (this.next >= TOTAL_FRAMES && this.inflight === 0 && !this.done) {
      this.done = true;
    }
    this.pump();
  }

  onProgress(h: LoadHandler): () => void {
    this.handlers.add(h);
    h(this.loaded);
    return () => {
      this.handlers.delete(h);
    };
  }

  /**
   * Force-complete loading: marks all unloaded frames as failed and
   * sets loaded to TOTAL_FRAMES so the consumer can proceed even if
   * images are slow or unreachable. Returns the count of images that
   * were actually loaded before the force.
   */
  forceComplete(): number {
    const previouslyLoaded = this.loaded;
    // Mark remaining unloaded slots as null (failed).
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!this.images[i]) {
        this.images[i] = null;
      }
    }
    // Advance counters so the pool drains.
    this.next = TOTAL_FRAMES;
    this.inflight = 0;
    if (this.loaded < TOTAL_FRAMES) {
      this.loaded = TOTAL_FRAMES;
      for (const h of this.handlers) h(this.loaded);
    }
    this.done = true;
    return previouslyLoaded;
  }

  get loadedCount() {
    return this.loaded;
  }

  get isDone() {
    return this.done;
  }

  /** Returns the nearest loaded frame to index, searching outward. */
  nearest(index: number): { index: number; image: HTMLImageElement } | null {
    if (index < 0) index = 0;
    if (index >= TOTAL_FRAMES) index = TOTAL_FRAMES - 1;
    if (this.images[index]) {
      return { index, image: this.images[index]! };
    }
    // search outward
    for (let d = 1; d < TOTAL_FRAMES; d++) {
      const lo = index - d;
      const hi = index + d;
      if (lo >= 0 && this.images[lo]) {
        return { index: lo, image: this.images[lo]! };
      }
      if (hi < TOTAL_FRAMES && this.images[hi]) {
        return { index: hi, image: this.images[hi]! };
      }
    }
    return null;
  }

  /** Get an exact frame, no fallback. */
  get(index: number): HTMLImageElement | null {
    return this.images[index] ?? null;
  }
}

let singleton: FrameSequence | null = null;

export function getFrameSequence(): FrameSequence {
  if (!singleton) singleton = new FrameSequence(6, 6);
  return singleton;
}

// ===========================================================================
// Sprint 2 — renderer-agnostic world layer.
//
// SequenceLayer owns ALL behavior for drawing the scroll-driven world:
// frame interpolation, motion-blur, vignette, and the physically-motivated
// "discovery" overlays (windows/lobby/reflection/roof that emerge with
// camera proximity — never switching on). The renderer (CinematicCanvas)
// knows nothing about any of this; it only calls render(env).
// ===========================================================================

import type { Layer, RenderEnv, WorldSource } from "@/lib/render";
import { WORLD, smoothstep, remapClamp } from "@/lib/motion";

class SequenceLayer implements Layer {
  id = "world-sequence";
  priority = 0;
  capabilities = { receivesCamera: true, receivesPostFX: true };

  private seq = getFrameSequence();
  // Owned offscreen buffers (renderer is stateless; the layer owns these).
  private scene: HTMLCanvasElement | null = null;
  private sctx: CanvasRenderingContext2D | null = null;
  private prev: HTMLCanvasElement | null = null;
  private pctx: CanvasRenderingContext2D | null = null;
  private lastW = 0;
  private lastH = 0;
  // Damped frame index for stable cross-fades (layer-owned state).
  private frameIndex = 0;
  private lastPainted = -1;
  private parallaxTick = 0;

  private ensureBuffers(w: number, h: number) {
    if (this.scene && this.lastW === w && this.lastH === h) return;
    this.lastW = w;
    this.lastH = h;
    this.scene = document.createElement("canvas");
    this.scene.width = w;
    this.scene.height = h;
    this.sctx = this.scene.getContext("2d", { alpha: false });
    if (this.sctx) {
      this.sctx.imageSmoothingEnabled = true;
      this.sctx.imageSmoothingQuality = "high";
    }
    this.prev = document.createElement("canvas");
    this.prev.width = w;
    this.prev.height = h;
    this.pctx = this.prev.getContext("2d", { alpha: false });
    if (this.pctx) {
      this.pctx.imageSmoothingEnabled = true;
      this.pctx.imageSmoothingQuality = "high";
      this.pctx.fillStyle = "#050505";
      this.pctx.fillRect(0, 0, w, h);
    }
  }

  visible(_env: RenderEnv): boolean {
    // The world is always present once any frame exists.
    return this.seq.isDone || this.seq.loadedCount > 0;
  }

  render(ctx: CanvasRenderingContext2D, env: RenderEnv): void {
    const { width: w, height: h, camera, dt, time } = env;
    this.ensureBuffers(w, h);
    const sctx = this.sctx;
    const pctx = this.pctx;
    const scene = this.scene;
    const prev = this.prev;
    if (!sctx || !pctx || !scene || !prev) return;

    const seq = this.seq;
    const total = TOTAL_FRAMES;

    // --- Frame interpolation (continuous, journeyProgress-driven) ---
    const target = camera.progress * (total - 1);
    this.frameIndex = this.frameIndex + (target - this.frameIndex) * (1 - Math.exp(-11 * dt));
    const idle = camera.velocity < 0.025;
    const drift = idle
      ? Math.sin(time * 0.18) * 0.1 + Math.sin(time * 0.07 + 1.3) * 0.06
      : 0;
    const finalIndex = this.frameIndex + drift;
    const lo = Math.max(0, Math.min(total - 1, Math.floor(finalIndex)));
    const hi = Math.max(0, Math.min(total - 1, Math.ceil(finalIndex)));
    const frac = finalIndex - lo;
    const dominant = Math.round(finalIndex);
    const ghostAlpha =
      camera.velocity > 0.35 ? Math.min(0.4, (camera.velocity - 0.35) * 0.8) : 0;
    const parallaxDrift = ++this.parallaxTick % 6 === 0;

    const offX = camera.offX;
    const offY = camera.offY;
    const scale = camera.scale;

    // Resolve the subject rect once (matches the fitted frame draw) so the
    // discovery overlays align to the actual architecture in the frame.
    const ref = seq.get(dominant) || seq.get(lo) || seq.get(hi);
    let subjRect = { x: 0, y: 0, w, h };
    if (ref) {
      const iw = ref.naturalWidth || ref.width;
      const ih = ref.naturalHeight || ref.height;
      if (iw && ih) {
        const s = Math.max(w / iw, h / ih) * WORLD.FIT_OVSCAN * scale;
        const dw = iw * s;
        const dh = ih * s;
        subjRect = { x: (w - dw) / 2 + offX, y: (h - dh) / 2 + offY, w: dw, h: dh };
      }
    }

    const drawFrame = (
      im: HTMLImageElement,
      alpha: number,
      c: CanvasRenderingContext2D,
      ox: number,
      oy: number,
      sc: number
    ) => {
      const iw = im.naturalWidth || im.width;
      const ih = im.naturalHeight || im.height;
      if (!iw || !ih) return;
      const s = (Math.max(w / iw, h / ih) * WORLD.FIT_OVSCAN) * sc;
      const dw = iw * s;
      const dh = ih * s;
      const x = (w - dw) / 2 + ox;
      const y = (h - dh) / 2 + oy;
      c.globalAlpha = alpha;
      c.drawImage(im, x, y, dw, dh);
      c.globalAlpha = 1;
    };

    const wantPaint =
      dominant !== this.lastPainted ||
      Math.abs(target - this.frameIndex) > 0.003 ||
      camera.velocity > 0.35 ||
      parallaxDrift;

    if (wantPaint) {
      // 1) Clean current scene offscreen.
      sctx.fillStyle = "#050505";
      sctx.fillRect(0, 0, w, h);
      const A = seq.get(lo);
      const B = seq.get(hi);
      if (A && B && lo !== hi) {
        drawFrame(A, 1 - frac, sctx, offX, offY, scale);
        drawFrame(B, frac, sctx, offX, offY, scale);
      } else if (A) {
        drawFrame(A, 1, sctx, offX, offY, scale);
      } else if (B) {
        drawFrame(B, 1, sctx, offX, offY, scale);
      }
      this.drawVignette(sctx, w, h);
      this.drawDiscovery(sctx, env, subjRect);

      // 2) Composite to main canvas with finite motion blur.
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      if (ghostAlpha > 0) {
        ctx.globalAlpha = 1;
        ctx.drawImage(prev, 0, 0);
        ctx.globalAlpha = 1 - ghostAlpha;
        ctx.drawImage(scene, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 1;
        ctx.drawImage(scene, 0, 0);
      }

      // 3) Save current scene for next frame's blur.
      pctx.fillStyle = "#050505";
      pctx.fillRect(0, 0, w, h);
      pctx.drawImage(scene, 0, 0);

      this.lastPainted = dominant;
    }
  }

  private drawVignette(c: CanvasRenderingContext2D, w: number, h: number) {
    const g = c.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.35,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.65, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    c.globalCompositeOperation = "multiply";
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
  }

  /**
   * Physically-motivated discovery. Nothing "switches on": detail, lobby,
   * occupied floors, reflection and roof all emerge as a function of camera
   * PROXIMITY (progress + how close the camera feels). Parked = static.
   * Each overlay is capped at WORLD.DISCOVERY_ALPHA so it reads as a lit,
   * occupied structure — never as VFX.
   */
  private drawDiscovery(
    c: CanvasRenderingContext2D,
    env: RenderEnv,
    rect: { x: number; y: number; w: number; h: number }
  ) {
    const { progress, camera, time } = env;
    // Proximity: 0 far silhouette → 1 intimate. Continuous.
    const p = remapClamp(progress, WORLD.PROXIMITY_FAR, WORLD.PROXIMITY_NEAR, 0, 1);
    if (p <= 0) return;

    const breath = 1 + Math.sin(time * WORLD.BREATH_RATE) * WORLD.BREATH_AMPLITUDE;
    const alpha = (a: number) => Math.min(WORLD.DISCOVERY_ALPHA, a) * breath;

    c.save();
    c.beginPath();
    c.rect(rect.x, rect.y, rect.w, rect.h);
    c.clip();
    c.globalCompositeOperation = "lighter";

    // --- Architectural detail emerges with proximity ---
    const detail = smoothstep(remapClamp(p, 0, WORLD.DETAIL_REVEAL, 0, 1));
    if (detail > 0) {
      c.globalAlpha = alpha(detail * 0.05);
      c.strokeStyle = "rgba(180,205,230,1)";
      c.lineWidth = Math.max(1, rect.w * 0.0009);
      const cols = 14;
      const rows = 26;
      for (let i = 1; i < cols; i++) {
        const x = rect.x + (rect.w * i) / cols;
        c.beginPath();
        c.moveTo(x, rect.y);
        c.lineTo(x, rect.y + rect.h);
        c.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = rect.y + (rect.h * j) / rows;
        c.beginPath();
        c.moveTo(rect.x, y);
        c.lineTo(rect.x + rect.w, y);
        c.stroke();
      }
    }

    // --- Occupied floors: warm window light, revealed bottom-up ---
    const win = smoothstep(remapClamp(p, WORLD.WINDOW_REVEAL, 0.85, 0, 1));
    if (win > 0) {
      const rows = 24;
      const cols = 12;
      for (let r = 0; r < rows; r++) {
        // Bottom-up reveal: lower rows appear first.
        const rowProg = (r + 1) / rows;
        const cell = smoothstep(remapClamp(win, 0, rowProg, 0, 1));
        if (cell <= 0) continue;
        for (let col = 0; col < cols; col++) {
          if ((r * 7 + col * 3) % 5 !== 0) continue; // sparse, occupied-only
          const x = rect.x + (rect.w * (col + 0.5)) / cols;
          const y = rect.y + (rect.h * (r + 0.5)) / rows;
          const s = rect.w * 0.012;
          c.globalAlpha = alpha(cell * 0.5);
          c.fillStyle = "rgba(255,224,170,1)";
          c.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }

    // --- Lobby / ground-level illumination becomes legible ---
    const lobby = smoothstep(remapClamp(p, WORLD.LOBBY_REVEAL, 1, 0, 1));
    if (lobby > 0) {
      const lh = rect.h * 0.12;
      const g = c.createLinearGradient(0, rect.y + rect.h - lh, 0, rect.y + rect.h);
      g.addColorStop(0, "rgba(255,224,170,0)");
      g.addColorStop(1, "rgba(255,224,170,1)");
      c.globalAlpha = alpha(lobby * 0.45);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y + rect.h - lh, rect.w, lh);
    }

    // --- Roof / crown discovered only near the end ---
    const roof = smoothstep(remapClamp(p, WORLD.ROOF_REVEAL, 1, 0, 1));
    if (roof > 0) {
      const rh = rect.h * 0.06;
      const g = c.createLinearGradient(0, rect.y, 0, rect.y + rh);
      g.addColorStop(0, "rgba(200,225,255,1)");
      g.addColorStop(1, "rgba(200,225,255,0)");
      c.globalAlpha = alpha(roof * 0.4);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y, rect.w, rh);
    }

    // --- Reflection strengthens with proximity + camera angle ---
    // A diagonal sheen whose position tracks the camera orbit/tilt, so the
    // surface "catches different reflections as the camera moves".
    const refl = smoothstep(p) * (0.5 + 0.5 * Math.abs(camera.orbit));
    if (refl > 0) {
      const shift = camera.orbit * rect.w * 0.5;
      const gx = rect.x + rect.w * 0.5 + shift;
      const g = c.createLinearGradient(gx - rect.w * 0.25, rect.y, gx + rect.w * 0.25, rect.y + rect.h);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.globalAlpha = alpha(refl * 0.12);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    c.restore();
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }

  dispose() {
    this.scene = null;
    this.prev = null;
    this.sctx = null;
    this.pctx = null;
  }
}

/**
 * Default WorldSource — the current single scroll-driven sequence.
 * Future scenes (multiple structures, skyline, landscape, water, bridges)
 * are new Layer / WorldSource implementations; the renderer is untouched.
 */
export class DefaultWorldSource implements WorldSource {
  private layer = new SequenceLayer();
  getLayers(_env: RenderEnv): Layer[] {
    return [this.layer];
  }
  dispose() {
    this.layer.dispose();
  }
}

let worldSingleton: WorldSource | null = null;

export function getWorldSource(): WorldSource {
  if (!worldSingleton) worldSingleton = new DefaultWorldSource();
  return worldSingleton;
}
