"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getScrollStore } from "./scroll";

/** Subscribe to normalized page scroll progress 0..1. */
export function useScrollProgress(): number {
  return useSyncExternalStore(
    (l) => getScrollStore().subscribe(l),
    () => getScrollStore().getProgress(),
    () => 0
  );
}

/** Subscribe to scroll velocity 0..1, decays after scroll stops. */
export function useScrollVelocity(): number {
  return useSyncExternalStore(
    (l) => getScrollStore().subscribe(l),
    () => getScrollStore().getVelocity(),
    () => 0
  );
}

/** Subscribe to the heavily-smoothed camera progress 0..1. */
export function useScrollCamera(): number {
  return useSyncExternalStore(
    (l) => getScrollStore().subscribe(l),
    () => getScrollStore().getCamera(),
    () => 0
  );
}

/**
 * Scroll-synced active chapter — Phase 2.
 *
 * Reads the SAME per-frame chapter measurements (`getChapterStates()`)
 * that SectionLight and SectionTransition use, so the rail, the key
 * light, and the dissolve pulse always agree on which chapter is
 * "active" in a given frame. That is scroll synchronization across
 * every layer that reacts to chapter position.
 *
 * Subscribes to the single shared scroll clock (the store's rAF) but
 * only triggers a React re-render when the active id actually changes
 * — so it costs nothing per frame, yet stays perfectly in lockstep
 * with the camera/atmosphere/lighting. Frame-rate-independent, too.
 *
 * `ids` is optional; pass it to restrict the active set (e.g. only the
 * real chapters, not FAQ/Footer). It is collapsed to a stable string
 * key so the effect re-runs only when the actual contents change.
 */
export function useActiveChapterSync(ids?: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids ? ids.join("|") : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const store = getScrollStore();
    const allowed = new Set(ids);
    const isAllowed = (id: string) => (allowed.size ? allowed.has(id) : true);

    let last: string | null = null;
    const read = () => {
      const states = store.getChapterStates();
      let best: string | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (!isAllowed(s.id)) continue;
        if (s.centerDist < bestDist) {
          bestDist = s.centerDist;
          best = s.id;
        }
      }
      if (best !== last) {
        last = best;
        setActive(best);
      }
    };

    const unsub = store.subscribe(read);
    read();
    return unsub;
    // `ids` is intentionally collapsed to `key` so this only re-subscribes
    // when the actual id set changes, not on every render's new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
