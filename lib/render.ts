/**
 * Renderer-agnostic contracts for the cinematic world.
 *
 * The renderer (CinematicCanvas) knows NOTHING about what a layer draws.
 * It only: requests layers from a WorldSource, filters invisible ones,
 * sorts by priority, calls render(), and disposes resources. A layer owns
 * all of its own drawing behavior — including any subject-specific detail
 * (a structure, water, a bridge, a skyline) which the renderer never sees.
 *
 * This file intentionally contains NO scene/subject nouns. "Layer" is the
 * only abstraction. Future content (buildings, landscape, bridges, water,
 * city blocks, skyline) is expressed purely as new Layer implementations.
 */

/** Continuous camera state — a pure function of journeyProgress + input. */
export interface CameraState {
  /** Continuous journey position 0..1 across the whole experience. */
  progress: number;
  /** Aggregated scroll velocity 0..1 (for motion feel, not branching). */
  velocity: number;
  /** Per-frame delta-time in seconds (clamped). */
  dt: number;
  /** Seconds since the loop started (for imperceptible breathing only). */
  time: number;
  /** Camera transform — the renderer applies these around the composite. */
  scale: number;
  offX: number;
  offY: number;
  /** Optional orientation hints (radians) for camera-coupled layers. */
  tilt: number;
  orbit: number;
  crane: number;
}

/**
 * The single source of rendering context handed to every layer each frame.
 * Layers read only from this — they never reach into the scroll store,
 * the Director, or any chapter system.
 */
export interface RenderEnv {
  /** Continuous journey position 0..1 (the ONLY narrative input). */
  progress: number;
  /** The fully-resolved camera for this frame. */
  camera: CameraState;
  /** Seconds since the loop started. */
  time: number;
  /** Per-frame delta-time in seconds. */
  dt: number;
  /** Device pixel ratio in use. */
  dpr: number;
  /** Canvas backing-store width (device pixels). */
  width: number;
  /** Canvas backing-store height (device pixels). */
  height: number;
}

/**
 * A drawable layer. Owns its rendering behavior entirely.
 * The renderer is stateless with respect to layer contents.
 */
export interface Layer {
  /** Stable identifier (debugging / disposal bookkeeping). */
  id: string;
  /** Draw order: lower renders first (back), higher last (front). */
  priority: number;
  /** Whether to draw this frame. Pure function of env — no side effects. */
  visible(env: RenderEnv): boolean;
  /** Paint this layer. The layer fully owns what it draws. */
  render(ctx: CanvasRenderingContext2D, env: RenderEnv): void;
  /** Optional capability flags — default behavior preserves today's pipeline. */
  capabilities?: {
    receivesCamera?: boolean;
    receivesLighting?: boolean;
    receivesPostFX?: boolean;
  };
  /** Optional teardown for owned resources (offscreen buffers, masks). */
  dispose?(): void;
}

/** Produces the layer set for a given rendering context. */
export interface WorldSource {
  getLayers(env: RenderEnv): Layer[];
  dispose?(): void;
}
