# Purchase Modal Architecture Report — RC13.5

## Bug: Modal Dialog Invisible

The backdrop rendered but the dialog did not.

### Root Causes Found

**Two interacting issues:**

#### 1. `AnimatePresence` wrapping a Portal

The old structure had `AnimatePresence` outside `createPortal`:

```
<AnimatePresence>               ← React tree
  {showModal && createPortal(
    <>
      <motion.div .../>         ← backdrop
      <motion.div .../>         ← dialog
    </>,
    document.body
  )}
</AnimatePresence>
```

`AnimatePresence`'s direct child was the Portal element itself, not the motion components. Framer Motion could not reliably traverse into the Portal to trigger enter animations on the motion children inside it. The backdrop appeared (its animation is simpler — opacity-only) but the dialog — which has three animated properties (`scale`, `y`, `opacity`) — remained stuck at its `initial` state.

**Fix:** Move `AnimatePresence` *inside* the Portal so the motion components are its direct children:

```
{createPortal(
  <AnimatePresence>              ← inside portal
    {showModal && (
      <>
        <motion.div .../>        ← backdrop
        <motion.div .../>        ← dialog
      </>
    )}
  </AnimatePresence>,
  document.body
)}
```

#### 2. Framer Motion transform overriding Tailwind centering

The dialog's `className` contained `-translate-x-1/2 -translate-y-1/2` (Tailwind's transform shorthand for centering). Framer Motion's `initial`/`animate` props (`scale`, `y`) applied inline `transform` styles that **overrode** Tailwind's `transform` shorthand (higher specificity). This:

1. Destroyed the horizontal `translate(-50%)`, shifting the dialog rightward
2. Combined with the initial animation state (`opacity: 0`), made the dialog effectively invisible even if the animation partially fired

**Fix:** Decoupled centering from animation by wrapping the `motion.div` dialog in a non-animated centering container:

```html
<div class="fixed inset-0 z-[201] grid place-items-center pointer-events-none">
  <motion.div class="pointer-events-auto w-full max-w-2xl ..." 
              initial={{ scale: 0.96, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}>
    <!-- dialog content -->
  </motion.div>
</div>
```

- The outer `div` handles viewport-filling fixed positioning and flexbox centering via `grid place-items-center`
- The inner `motion.div` handles only the entrance animation via Framer Motion — no Tailwind transform classes to conflict

## Files Changed

| File | Change |
|------|--------|
| `components/presale/PresalePurchasePanel.tsx` | Restructured portal/AnimatePresence nesting; added centering wrapper; removed conflicting transform classes |

## Build

```
✓ Compiled successfully in 16.9s
  Running TypeScript ...
  Finished TypeScript in 7.7s ...
  Generating static pages using 7 workers (6/6) in 705ms
```

Zero TypeScript errors.
