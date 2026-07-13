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
    if (typeof console !== "undefined" && process.env.NODE_ENV !== "production") {
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
import { WORLD, smoothstep, remapClamp, sampleVisualBeat, type VisualBeat } from "@/lib/motion";

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
  // Building mask: a per-frame bounding box (normalised 0..1 in image space)
  // derived from the frame's own structure, so architectural overlays are
  // clipped to where the photographed building actually is — never to sky
  // or ground. Computed once per dominant frame and cached.
  private maskCanvas: HTMLCanvasElement | null = null;
  private boxCache = new Map<number, { x0: number; y0: number; x1: number; y1: number } | null>();

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

    const scale = camera.scale;

    // --- Cinematic framing driven by the visual-beat storyboard ----------
    // sampleVisualBeat(progress) returns the felt intent for the current
    // point in the journey (monumental/low-angle early → expansive/bright
    // late). It is a pure function of progress — the renderer never sees
    // chapter identity. compose-scale grows/shrinks the subject; offX/offY
    // bias it off dead-centre (rule of thirds) and drop it for a low-angle
    // sky. The offset is clamped to the *effective* overscan margin so no
    // hard edge is revealed (expansive beats intentionally reveal sky).
    const beat = sampleVisualBeat(camera.progress);
    const compose = beat.scale;
    const eff = WORLD.FIT_OVSCAN * compose; // effective cover factor this beat
    const margin = Math.max(0, eff - 1) * 0.5; // fraction of overflow per side
    const maxX = w * margin * 0.82;
    const maxY = h * margin * 0.82;
    let offX = camera.offX + beat.offX * w;
    let offY = camera.offY + beat.offY * h;
    offX = Math.max(-maxX, Math.min(maxX, offX));
    offY = Math.max(-maxY, Math.min(maxY, offY));

    // Resolve the subject rect once (matches the fitted frame draw) so the
    // discovery overlays align to the actual architecture in the frame.
    const ref = seq.get(dominant) || seq.get(lo) || seq.get(hi);
    let subjRect = { x: 0, y: 0, w, h };
    if (ref) {
      const iw = ref.naturalWidth || ref.width;
      const ih = ref.naturalHeight || ref.height;
      if (iw && ih) {
        const s = Math.max(w / iw, h / ih) * WORLD.FIT_OVSCAN * compose * scale;
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
      const s = (Math.max(w / iw, h / ih) * WORLD.FIT_OVSCAN * compose) * sc;
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
      this.drawVignette(sctx, w, h, beat.light);
      this.drawDiscovery(sctx, env, subjRect, beat, ref, dominant);

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

  /**
   * Derive the building's bounding box from the frame itself. The building is
   * the structured region of the photograph (window grid, edges); sky and
   * ground are smooth and low-structure. We downscale the dominant frame,
   * measure horizontal/vertical luminance structure per row/column, and take
   * the extent where structure exceeds a fraction of the maximum. Mapped
   * through the fitted subject rect, this clips overlays to the architecture.
   */
  private getBuildingBox(im: HTMLImageElement, key: number): { x0: number; y0: number; x1: number; y1: number } | null {
    const cached = this.boxCache.get(key);
    if (cached !== undefined) return cached;
    const iw = im.naturalWidth || im.width;
    const ih = im.naturalHeight || im.height;
    if (!iw || !ih) { this.boxCache.set(key, null); return null; }
    const sw = 72;
    const sh = Math.max(1, Math.round((sw * ih) / iw));
    if (!this.maskCanvas) this.maskCanvas = document.createElement("canvas");
    const mc = this.maskCanvas;
    mc.width = sw;
    mc.height = sh;
    const mctx = mc.getContext("2d", { willReadFrequently: true });
    if (!mctx) { this.boxCache.set(key, null); return null; }
    mctx.clearRect(0, 0, sw, sh);
    mctx.drawImage(im, 0, 0, sw, sh);
    const data = mctx.getImageData(0, 0, sw, sh).data;
    const lum = (x: number, y: number) => {
      const i = (y * sw + x) * 4;
      return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    };
    let maxR = 0;
    const rowS = new Float32Array(sh);
    for (let y = 0; y < sh; y++) {
      let s = 0;
      for (let x = 0; x < sw - 1; x++) s += Math.abs(lum(x, y) - lum(x + 1, y));
      rowS[y] = s / (sw - 1);
      if (rowS[y] > maxR) maxR = rowS[y];
    }
    let maxC = 0;
    const colS = new Float32Array(sw);
    for (let x = 0; x < sw; x++) {
      let s = 0;
      for (let y = 0; y < sh - 1; y++) s += Math.abs(lum(x, y) - lum(x, y + 1));
      colS[x] = s / (sh - 1);
      if (colS[x] > maxC) maxC = colS[x];
    }
    const thr = 0.32;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < sh; y++) {
      if (rowS[y] > thr * maxR) { if (y0 < 0) y0 = y; y1 = y; }
    }
    let x0 = -1, x1 = -1;
    for (let x = 0; x < sw; x++) {
      if (colS[x] > thr * maxC) { if (x0 < 0) x0 = x; x1 = x; }
    }
    let box: { x0: number; y0: number; x1: number; y1: number } | null = null;
    if (y0 >= 0 && x0 >= 0 && y1 - y0 > 2 && x1 - x0 > 2) {
      const pad = 0.02;
      box = {
        x0: Math.max(0, x0 / sw - pad),
        y0: Math.max(0, y0 / sh - pad),
        x1: Math.min(1, x1 / sw + pad),
        y1: Math.min(1, y1 / sh + pad),
      };
    }
    this.boxCache.set(key, box);
    return box;
  }

  private drawVignette(c: CanvasRenderingContext2D, w: number, h: number, lightMood: number) {
    // The finale reads "bright clean white", so the vignette eases open as
    // lightMood → 1 (less edge crush), while the hero stays moody/cool.
    const edge = 0.4 * (1 - 0.55 * lightMood);
    const mid = 0.14 * (1 - 0.4 * lightMood);
    const g = c.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.42,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.74
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.62, `rgba(0,0,0,${mid.toFixed(3)})`);
    g.addColorStop(1, `rgba(0,0,0,${edge.toFixed(3)})`);
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
   * occupied, glazed structure — never as VFX.
   *
   * Material language (P5): glass reads as depth via a soft vertical sheen
   * (cool sky at the top, warmer at the base) and a second diagonal
   * reflection that tracks the camera. Edges are crisp, not bloomed. Warm
   * interior light is the only additive ("lighter") pass — everything else
   * is screened so the structure stays photographic, not glowing.
   */
  private drawDiscovery(
    c: CanvasRenderingContext2D,
    env: RenderEnv,
    rect: { x: number; y: number; w: number; h: number },
    beat: VisualBeat,
    ref: HTMLImageElement | null,
    dominant: number
  ) {
    const { progress, camera, time } = env;
    const lightMood = beat.light;
    // Proximity: 0 far silhouette → 1 intimate. Continuous.
    const p = remapClamp(progress, WORLD.PROXIMITY_FAR, WORLD.PROXIMITY_NEAR, 0, 1);
    if (p <= 0) return;

    // Pacing: stiller beats breathe less (the monument feels permanent).
    const breathAmp = WORLD.BREATH_AMPLITUDE * (0.6 + 0.4 * beat.pace);
    const breath = 1 + Math.sin(time * WORLD.BREATH_RATE) * breathAmp;
    const alpha = (a: number) => Math.min(WORLD.DISCOVERY_ALPHA, a) * breath;

    // Interior occupancy light: at the hero it is extremely subtle, nearly
    // neutral and slightly cooler; as the journey progresses it eases toward
    // a warm-white occupancy — premium architectural lighting, never amber or
    // residential tungsten. The shift is almost subconscious (lightMood 0→1).
    const mix = (a: number, b: number) => a + (b - a) * lightMood;
    const winR = mix(226, 246) | 0, winG = mix(232, 240) | 0, winB = mix(242, 230) | 0;
    const winColor = `rgba(${winR},${winG},${winB},1)`;

    // Constrain every overlay to the photographed building. Derive the
    // building box from the frame and map it through the fitted subject
    // rect; fall back to a conservative inset so overlays never reach the
    // frame edges (sky/ground) even if detection is unavailable.
    let clip = rect;
    const norm = ref ? this.getBuildingBox(ref, dominant) : null;
    if (norm) {
      clip = {
        x: rect.x + norm.x0 * rect.w,
        y: rect.y + norm.y0 * rect.h,
        w: (norm.x1 - norm.x0) * rect.w,
        h: (norm.y1 - norm.y0) * rect.h,
      };
    } else {
      const m = 0.08;
      clip = {
        x: rect.x + rect.w * m,
        y: rect.y + rect.h * m,
        w: rect.w * (1 - 2 * m),
        h: rect.h * (1 - 2 * m),
      };
    }

    c.save();
    c.beginPath();
    c.rect(clip.x, clip.y, clip.w, clip.h);
    c.clip();

    // --- Coated-glass reflection ----------------------------------------
    // Real curtain-wall glazing reflects a continuous scene from top to
    // bottom: bright sky → a soft horizon band → darker ground/architecture.
    // Screened (not added) so it tints like glass rather than glowing. Many
    // closely-spaced stops make the falloff read as a smooth optical coating,
    // never as banding. Intensity is unchanged (alpha caps identical).
    const glass = smoothstep(remapClamp(p, WORLD.DETAIL_REVEAL, 1, 0, 1));
    if (glass > 0) {
      // Sky (top) cools slightly; ground (base) carries the warmer reflection.
      const skyR = mix(206, 232) | 0, skyG = mix(226, 240) | 0, skyB = mix(250, 250) | 0;
      const horR = mix(198, 236) | 0, horG = mix(214, 238) | 0, horB = mix(236, 244) | 0;
      const grdR = mix(206, 222) | 0, grdG = mix(198, 216) | 0, grdB = mix(184, 208) | 0;
      const g = c.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      // Sky reflection — brightest at the very top, easing down gently.
      g.addColorStop(0.0,  `rgba(${skyR},${skyG},${skyB},0.85)`);
      g.addColorStop(0.14, `rgba(${skyR},${skyG},${skyB},0.55)`);
      g.addColorStop(0.28, "rgba(188,206,230,0.34)");
      // Soft horizon band — where sky meets reflected surroundings.
      g.addColorStop(0.40, `rgba(${horR},${horG},${horB},0.5)`);
      g.addColorStop(0.52, "rgba(180,198,222,0.28)");
      // Reflected architecture / ground — a quiet, deeper foot.
      g.addColorStop(0.72, "rgba(168,182,204,0.2)");
      g.addColorStop(1.0,  `rgba(${grdR},${grdG},${grdB},0.5)`);
      c.globalCompositeOperation = "screen";
      c.globalAlpha = alpha(glass * 0.5);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y, rect.w, rect.h);

      // A broad, heavily-feathered grazing reflection across the facade —
      // the sheen of light on coated glass. Its centre is anchored and drifts
      // only imperceptibly with the camera, and the falloff is so wide and
      // symmetric that it never reads as a moving highlight — only as depth.
      const refl = smoothstep(p);
      const shift = camera.orbit * rect.w * 0.12; // barely perceptible
      const gx = rect.x + rect.w * 0.42 + shift;
      const rg = c.createLinearGradient(
        gx - rect.w * 0.7, rect.y, gx + rect.w * 0.7, rect.y + rect.h
      );
      rg.addColorStop(0.0, "rgba(226,238,252,0)");
      rg.addColorStop(0.32, "rgba(230,240,252,0.28)");
      rg.addColorStop(0.5, "rgba(236,244,255,0.42)");
      rg.addColorStop(0.68, "rgba(230,240,252,0.28)");
      rg.addColorStop(1.0, "rgba(226,238,252,0)");
      c.globalAlpha = alpha(refl * 0.32);
      c.fillStyle = rg;
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    // --- Architectural edges: crisp leading lines (not bloom) -----------
    const detail = smoothstep(remapClamp(p, 0, WORLD.DETAIL_REVEAL, 0, 1));
    if (detail > 0) {
      c.globalCompositeOperation = "source-over";
      c.lineWidth = Math.max(1, rect.w * 0.0007);
      const cols = 14;
      const rows = 26;
      // Faint vertical mullions
      c.globalAlpha = alpha(detail * 0.035);
      c.strokeStyle = "rgba(198,216,236,1)";
      for (let i = 1; i < cols; i++) {
        const x = rect.x + (rect.w * i) / cols;
        c.beginPath();
        c.moveTo(x, rect.y);
        c.lineTo(x, rect.y + rect.h);
        c.stroke();
      }
      // Faint floor lines
      c.globalAlpha = alpha(detail * 0.03);
      c.strokeStyle = "rgba(188,206,228,1)";
      for (let j = 1; j < rows; j++) {
        const y = rect.y + (rect.h * j) / rows;
        c.beginPath();
        c.moveTo(rect.x, y);
        c.lineTo(rect.x + rect.w, y);
        c.stroke();
      }
      // Crisp outer silhouette edges — the building reads as a defined mass.
      // (No full-frame rectangle: edges live only inside the building clip.)
    }

    // --- Occupied floors: warm window light, revealed bottom-up ----------
    // The only additive pass — interior light glowing through glazing.
    const win = smoothstep(remapClamp(p, WORLD.WINDOW_REVEAL, 0.85, 0, 1));
    if (win > 0) {
      c.globalCompositeOperation = "lighter";
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
          const s = rect.w * 0.011;
          c.globalAlpha = alpha(cell * 0.42);
          c.fillStyle = winColor;
          c.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }

    // --- Lobby / ground-level illumination becomes legible ---------------
    const lobby = smoothstep(remapClamp(p, WORLD.LOBBY_REVEAL, 1, 0, 1));
    if (lobby > 0) {
      c.globalCompositeOperation = "lighter";
      const lh = rect.h * 0.13;
      const g = c.createLinearGradient(0, rect.y + rect.h - lh, 0, rect.y + rect.h);
      g.addColorStop(0, `rgba(${winR},${winG},${winB},0)`);
      g.addColorStop(1, `rgba(${winR},${winG},${winB},1)`);
      c.globalAlpha = alpha(lobby * 0.4);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y + rect.h - lh, rect.w, lh);
    }

    // --- Roof / crown discovered only near the end -----------------------
    const roof = smoothstep(remapClamp(p, WORLD.ROOF_REVEAL, 1, 0, 1));
    if (roof > 0) {
      c.globalCompositeOperation = "lighter";
      const rh = rect.h * 0.06;
      const g = c.createLinearGradient(0, rect.y, 0, rect.y + rh);
      g.addColorStop(0, "rgba(208,228,255,1)");
      g.addColorStop(1, "rgba(208,228,255,0)");
      c.globalAlpha = alpha(roof * 0.34);
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y, rect.w, rh);
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
