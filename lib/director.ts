/**
 * Director — Phase-aware milestone orchestration layer.
 *
 * This is NOT an animation engine and NOT a second clock. It is a tiny
 * state holder that sequences the experience as a chain of EVENT-DRIVEN
 * milestones. Advancement waits until the previous stage is actually
 * ready (fired by the real components), so slower GPUs never flash a
 * half-initialized scene.
 *
 * Design rules honoured:
 *   - Continues to use the shared ScrollStore (scroll state lives there
 *     only — nothing is duplicated here).
 *   - Owns NO rAF loop. Layers read `trackProgress()` / stage flags from
 *     inside their own existing rAF ticks; React UI subscribes via
 *     `subscribe()` (useSyncExternalStore pattern, like lib/hooks.ts).
 *   - Reduced motion: snaps every phase to its fully-revealed state.
 *
 * PHASES
 * -------
 * The API is phase-aware so future chapters (marketplace, roadmap, city,
 * finale) extend without restructuring. Each phase registers its own
 * milestone order and owns four tracks:
 *     camera | lighting | environment | transitions
 * Only the Hero phase is wired now; the rest are typed but inert.
 *
 * HERO MILESTONES (ordinal, event-driven — never time-elapsed):
 *   0 App Mounted
 *   1 Canvas Ready
 *   2 First Frame Rendered (World Ready)
 *   3 Particles Initialized
 *   4 Lighting Initialized
 *   5 Hero Ready
 *   6 Headline Reveal
 *   7 CTA Reveal
 *   8 Scroll Hint
 */

export type PhaseId = "hero" | "marketplace" | "roadmap" | "city" | "finale";

export type Track = "camera" | "lighting" | "environment" | "transitions";

type Listener = () => void;

/** Hero milestone names, in ordinal order. */
export const HERO_MILESTONES = [
  "mounted",
  "canvas-ready",
  "world-ready",
  "particles-ready",
  "lighting-ready",
  "hero-ready",
  "headline",
  "cta",
  "scroll-hint",
] as const;

type HeroMilestone = (typeof HERO_MILESTONES)[number];

class Director {
  private listeners = new Set<Listener>();

  // Active phase (scroll-driven handoff; Hero until chapters are wired).
  private activePhase: PhaseId = "hero";

  // Per-phase milestone registry: phase -> ordered milestone labels.
  private phases = new Map<PhaseId, string[]>();
  // Per-phase current ordinal stage.
  private stage = new Map<PhaseId, number>();
  // Per-phase "all boot milestones satisfied" flag.
  private ready = new Map<PhaseId, boolean>();

  // Hero convenience flags (mirror milestones for the brief's API).
  private flags: Record<HeroMilestone, boolean> = {
    mounted: true,
    "canvas-ready": false,
    "world-ready": false,
    "particles-ready": false,
    "lighting-ready": false,
    "hero-ready": false,
    headline: false,
    cta: false,
    "scroll-hint": false,
  };

  private reduced = false;

  constructor() {
    this.registerPhase("hero", HERO_MILESTONES as unknown as string[]);
    // Future phases: registered inert (no milestones) — API ready.
    this.registerPhase("marketplace", []);
    this.registerPhase("roadmap", []);
    this.registerPhase("city", []);
    this.registerPhase("finale", []);

    if (typeof window !== "undefined") {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (this.reduced) this.snapAllToRevealed();
    } else {
      // SSR: treat as fully revealed (no listeners, no crash).
      this.snapAllToRevealed();
    }
  }

  // ---- Phase control -------------------------------------------------

  registerPhase(id: PhaseId, milestones: string[]): void {
    if (!this.phases.has(id)) {
      this.phases.set(id, milestones);
      this.stage.set(id, 0);
      this.ready.set(id, false);
    }
  }

  setActivePhase(id: PhaseId): void {
    if (this.activePhase === id) return;
    this.activePhase = id;
    this.emit();
  }

  getActivePhase(): PhaseId {
    return this.activePhase;
  }

  onPhaseChange(cb: (id: PhaseId) => void): () => void {
    const l = () => cb(this.activePhase);
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  // ---- Milestone advancement (event-driven) -------------------------

  /**
   * Mark a named milestone reached. For the Hero phase this advances the
   * ordinal stage to the milestone's index once all prior milestones are
   * true — i.e. advancement waits for the previous stage to be ready.
   */
  markReady(milestone: string): void {
    const labels = this.phases.get(this.activePhase) ?? [];
    const idx = labels.indexOf(milestone);
    if (idx < 0) return;

    // Gate: every prior milestone must already be set.
    for (let i = 0; i < idx; i++) {
      if (!this.isStage(labels[i])) return;
    }

    if (milestone in this.flags) {
      (this.flags as Record<string, boolean>)[milestone] = true;
    }
    const cur = this.stage.get(this.activePhase) ?? 0;
    if (idx > cur) {
      this.stage.set(this.activePhase, idx);
      this.emit();
    }
    // Boot complete once the last *boot* milestone (hero-ready) is set.
    if (milestone === "hero-ready") this.ready.set(this.activePhase, true);
  }

  /** Manual content-beat advance (Hero: headline -> cta -> scroll-hint). */
  advanceStage(): void {
    const cur = this.stage.get(this.activePhase) ?? 0;
    const max = (this.phases.get(this.activePhase) ?? []).length - 1;
    if (cur < max) {
      this.stage.set(this.activePhase, cur + 1);
      const labels = this.phases.get(this.activePhase) ?? [];
      const name = labels[cur + 1];
      if (name && name in this.flags) {
        (this.flags as Record<string, boolean>)[name] = true;
      }
      this.emit();
    }
  }

  currentStage(): number {
    return this.stage.get(this.activePhase) ?? 0;
  }

  isStage(name: string): boolean {
    if (name in this.flags) return this.flags[name as HeroMilestone];
    // Generic: stage ordinal at/after the milestone index.
    const labels = this.phases.get(this.activePhase) ?? [];
    const idx = labels.indexOf(name);
    if (idx < 0) return false;
    return (this.stage.get(this.activePhase) ?? 0) >= idx;
  }

  // ---- Hero convenience queries (brief API) -------------------------

  isCanvasReady(): boolean {
    return this.flags["canvas-ready"];
  }
  isWorldReady(): boolean {
    return this.flags["world-ready"];
  }
  isHeroReady(): boolean {
    return this.flags["hero-ready"];
  }

  // ---- Track intensity (0..1) read by existing layers ---------------

  /**
   * Returns a 0..1 intensity for a phase track. Layers multiply their
   * opacity/intensity by this, gated by milestone readiness so nothing
   * reveals before its stage is actually ready.
   *
   * Hero mapping:
   *   environment -> particles + atmosphere (Stage >= 3)
   *   lighting    -> volumetric + key light (Stage >= 4)
   *   camera      -> dolly/orbit (Stage >= 5, continues into scroll)
   *   transitions -> chapter dissolve (Stage >= 5)
   */
  trackProgress(phase: PhaseId, track: Track): number {
    if (this.reduced) return 1;
    if (phase !== "hero") return this.ready.get(phase) ? 1 : 0;

    const s = this.currentStage();
    switch (track) {
      case "environment":
        return s >= 3 ? 1 : 0;
      case "lighting":
        return s >= 4 ? 1 : 0;
      case "camera":
        // Ramps in at Hero Ready and stays (scroll continues the dolly).
        return s >= 5 ? 1 : 0;
      case "transitions":
        return s >= 5 ? 1 : 0;
      default:
        return 0;
    }
  }

  // ---- Subscription (no rAF of its own) -----------------------------

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  /** Reduced motion: jump every phase to its revealed end-state. */
  private snapAllToRevealed() {
    this.reduced = true;
    for (const id of this.phases.keys()) {
      const labels = this.phases.get(id) ?? [];
      this.stage.set(id, Math.max(0, labels.length - 1));
      this.ready.set(id, true);
    }
    for (const k of Object.keys(this.flags) as HeroMilestone[]) {
      this.flags[k] = true;
    }
  }
}

let director: Director | null = null;

const SSR_DIRECTOR = {
  registerPhase: () => {},
  setActivePhase: () => {},
  getActivePhase: () => "hero" as PhaseId,
  onPhaseChange: () => () => {},
  markReady: () => {},
  advanceStage: () => {},
  currentStage: () => 8,
  isStage: () => true,
  isCanvasReady: () => true,
  isWorldReady: () => true,
  isHeroReady: () => true,
  trackProgress: () => 1,
  subscribe: () => () => {},
} as unknown as Director;

export function getDirector(): Director {
  if (typeof window === "undefined") return SSR_DIRECTOR;
  if (!director) director = new Director();
  return director;
}
