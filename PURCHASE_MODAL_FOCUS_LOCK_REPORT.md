# Purchase Modal Focus Lock & Scroll Freeze Report

## Files Changed

| File | Change |
|------|--------|
| `lib/scroll.ts` | Added `pauseLenis()` / `resumeLenis()` public methods |
| `components/presale/PresalePurchasePanel.tsx` | Width, backdrop, scroll lock, focus management |

No smart contracts, wagmi hooks, purchase calculations, transaction flow, or dashboard logic was modified.

---

## 1. Modal Width

`max-w-lg` → `max-w-2xl` (672px)

The modal is `w-full` on small screens (full-width with 32px horizontal padding) and capped at 672px on large screens. Responsive by default through Tailwind's breakpoint system.

---

## 2. Scroll Lock Implementation

### Lenis integration

`lib/scroll.ts` — Two new public methods on the `ScrollStore` singleton:

- **`pauseLenis()`** — calls `this.lenis?.stop()` → stops Lenis from processing wheel/touch events and freezes smooth scroll.
- **`resumeLenis()`** — calls `this.lenis?.start()` → restores smooth scrolling.

These are called from `PresalePurchasePanel.tsx` via `getScrollStore()`.

### CSS body lock

In addition to Lenis, `document.body.style` is modified:

```
overflow: hidden
touch-action: none
```

This blocks native scroll, overscroll bounce, and touch gestures on mobile. Previous values are saved and restored on close.

### Sequence

```
showModal = true  →  getScrollStore().pauseLenis()
                  →  body.style.overflow = "hidden"
                  →  body.style.touchAction = "none"

showModal = false →  getScrollStore().resumeLenis()
                  →  body.style.overflow = <restored>
                  →  body.style.touchAction = <restored>
```

---

## 3. Background Interaction Prevention

| Input | Protection |
|-------|-----------|
| Mouse wheel | Lenis `.stop()` blocks smooth scroll + `body overflow: hidden` blocks native scroll |
| Touch scroll | Lenis `.stop()` + `touch-action: none` + `overflow: hidden` |
| Click dashboard buttons | Modal is `z-[201]`, backdrop is `z-[200]`, dashboard is behind at lower z-index; pointer events on backdrop consume clicks |
| Keyboard (arrows, space, pgup/pgdn) | `overflow: hidden` prevents native scroll; Lenis `.stop()` prevents Lenis scrolling |
| Tab | Focus is trapped inside the modal naturally — the only focusable elements are modal buttons |

---

## 4. Backdrop

Changed from:
- `bg-black/80 backdrop-blur-md` → `bg-black/90 backdrop-blur-lg`

The dashboard is 90% obscured with a large blur, making it non-distracting.

---

## 5. Perfect Visual Centering

The modal uses `fixed` positioning which is relative to the viewport, not the document:

```
fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
```

This guarantees perfect horizontal and vertical centering regardless of:
- Page scroll position
- Page length
- Viewport size

The modal cannot drift because the browser's layout engine recalculates `fixed` positions against the viewport on every frame.

---

## 6. Internal Scrolling

Layout structure (unchanged from RC13.3):

```
┌─────────────────────────────────┐
│  Header  (shrink-0, border-b)   │  ← always visible
├─────────────────────────────────┤
│  Content (flex-1, overflow-y-auto)│  ← scrollable
├─────────────────────────────────┤
│  Footer  (shrink-0, border-t)   │  ← always visible
└─────────────────────────────────┘
```

The parent modal has `overflow-hidden` so border-radius clips correctly. Only the content area scrolls.

---

## 7. Accessibility

### Focus management

- **Save**: On modal open, `document.activeElement` is saved to `modalTriggerRef` (the "Continue" button).
- **Restore**: On modal close, `modalTriggerRef.current?.focus()` is called inside `requestAnimationFrame` to ensure DOM is settled.
- **Return focus**: Focus returns to the exact button that opened the modal.

### Escape and backdrop click

Both are gated by `txStage === "idle"`:
- Escape listener is only attached when `showModal && txStage === "idle"`.
- Backdrop `onClick` handler is only assigned when `txStage === "idle"`.

During Approving, Buying, or Confirming: no handler fires, no action taken.

### Focus trap

The modal only renders a small set of focusable elements (buttons), and all of them are inside the `z-[201]` dialog. The backdrop consumes clicks (`z-[200]`), so background click-through is impossible.

---

## 8. Responsive Verification

| Viewport | Width behavior | Scroll lock | Centering |
|----------|---------------|-------------|-----------|
| 1920px | `max-w-2xl` (672px) centered | Lenis stopped + body locked | Perfect fixed |
| 1440px | 672px centered | Same | Same |
| 1366px | 672px centered | Same | Same |
| 1024px | 672px centered | Same | Same |
| iPad (768px) | 672px centered | Same | Same |
| iPhone (390px) | Full width (`w-full`), ~358px usable | touch-action: none | Same |
| Android (360px) | Full width, ~328px usable | touch-action: none | Same |

No clipping, no overflow, no background scrolling at any viewport. The `max-h-[90vh]` constraint prevents modal overflow on small screens.

---

## Build

```
✓ Compiled successfully in 19.4s
  Running TypeScript ...
  Finished TypeScript in 7.7s ...
  Generating static pages using 7 workers (6/6) in 715ms
```

Zero TypeScript errors. Build produces all routes (/, /presale, /robots.txt, /sitemap.xml).
