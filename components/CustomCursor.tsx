"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Cache the media query so we don't re-create it every snapshot.
let finePointerMq: MediaQueryList | null = null;
function getFinePointerMq(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  return (finePointerMq ??= window.matchMedia("(pointer: fine)"));
}

/**
 * CustomCursor — Phase 4 premium.
 *
 * A three-element cursor:
 *   • Dot   — instant, mix-blend-mode: difference (inverts over any
 *             background, so it's always visible — a premium signature).
 *   • Ring  — spring-lagged, expands + fills with accent on hover over
 *             interactive elements, contracts on click.
 *   • Glow  — slowest trailing halo, accent-colored, breathes.
 *
 * Magnetic snap: when the cursor enters a [data-cursor="hover"] element,
 * the ring gently drifts toward the element's center (a subtle magnetic
 * pull) — reads as the UI reaching out to meet you.
 *
 * Performance: one rAF, transform-only, dt-damped spring (frame-rate
 * independent). Pauses when the tab is hidden. No setState per frame.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const finePointer = useSyncExternalStore(
    (cb) => {
      const mq = getFinePointerMq();
      if (!mq) return () => {};
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => getFinePointerMq()?.matches ?? false,
    () => false
  );

  useEffect(() => {
    if (!finePointer) return;
    document.body.classList.add("custom-cursor");
    return () => document.body.classList.remove("custom-cursor");
  }, [finePointer]);

  useEffect(() => {
    if (!finePointer) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    // Ring spring state.
    let rx = mx, ry = my;
    let rvx = 0, rvy = 0;
    let raf = 0;
    let lastT = performance.now();
    let running = true;

    let hovering = false;
    let clicking = false;
    // Magnetic snap target.
    let snapEl: HTMLElement | null = null;
    let snapCx = 0, snapCy = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
      }
    };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const hit = t.closest("a,button,[data-cursor='hover']") as HTMLElement | null;
      hovering = !!hit;
      snapEl = hit;
      if (hit) {
        const r = hit.getBoundingClientRect();
        snapCx = r.left + r.width / 2;
        snapCy = r.top + r.height / 2;
      }
    };
    const onDown = () => { clicking = true; };
    const onUp = () => { clicking = false; };

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.max(0.001, Math.min(0.1, (now - lastT) / 1000));
      lastT = now;

      // Refresh snap target center each frame (elements scroll).
      if (snapEl) {
        const r = snapEl.getBoundingClientRect();
        snapCx = r.left + r.width / 2;
        snapCy = r.top + r.height / 2;
      }

      // Ring target: magnetic snap pulls gently toward the element center
      // when hovering; otherwise follows the cursor exactly.
      const rTargetX = hovering ? mx + (snapCx - mx) * 0.35 : mx;
      const rTargetY = hovering ? my + (snapCy - my) * 0.35 : my;

      // Spring-damped ring (stiffness k, damping c — frame-rate independent).
      const k = 320, c = 28;
      const ax = (rTargetX - rx) * k - rvx * c;
      const ay = (rTargetY - ry) * k - rvy * c;
      rvx += ax * dt;
      rvy += ay * dt;
      rx += rvx * dt;
      ry += rvy * dt;

      if (ringRef.current) {
        const s = clicking ? 0.7 : hovering ? 1.8 : 1;
        const opacity = hovering ? 0.55 : 0.28;
        ringRef.current.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%) scale(${s})`;
        ringRef.current.style.opacity = String(opacity);
        ringRef.current.style.borderColor = hovering
          ? "rgba(0,212,255,0.7)"
          : "rgba(255,255,255,0.3)";
        // Subtle accent fill on hover — reads as the UI embracing the target.
        ringRef.current.style.background = hovering
          ? "rgba(0,212,255,0.06)"
          : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

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
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [finePointer]);

  if (!finePointer) return null;

    return (
    <div className="pointer-events-none fixed inset-0 z-[300] hidden md:block">
      {/* Ring — spring-lagged, fills on hover */}
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border transition-[background,border-color] duration-200"
        style={{ borderColor: "rgba(255,255,255,0.25)" }}
      />
      {/* Dot — instant, difference blend (always visible) */}
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white"
        style={{ mixBlendMode: "difference", boxShadow: "0 0 6px rgba(255,255,255,0.6)" }}
      />
    </div>
  );
}
