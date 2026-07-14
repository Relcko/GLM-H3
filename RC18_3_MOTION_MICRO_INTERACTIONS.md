# RC18.3 — Motion & Micro-Interaction Polish

**Role:** Senior Motion Designer + Senior Frontend Engineer
**Scope:** `app/globals.css` (shared motion language) + `components/presale/PresalePurchasePanel.tsx` + `components/presale/InvestmentSummary.tsx`
**Status:** RC18.0 / RC18.1 / RC18.2 complete → RC18.3 applied. Layout, grid, responsive behavior, typography, and all logic (wagmi / viem / wallet / purchase / staking / APIs / hooks) untouched.
**Build:** `npm run build` ✅ · **TypeScript:** `tsc --noEmit` ✅
**Aesthetic target:** calm, premium, expensive (Apple / Stripe / Linear). No gaming UI.

---

## 1. Shared Timing System

Added to `:root` in `app/globals.css`:

| Token | Value | Use |
|-------|-------|-----|
| `--motion-fast` | `180ms` | micro fades, placeholder |
| `--motion-normal` | `280ms` | hover, focus, chip glide, button glow |
| `--motion-slow` | `450ms` | glass surface calm |
| `--ease-lux` | `cubic-bezier(0.16, 1, 0.3, 1)` | all motion (already present) |

All interactive transitions now route through these tokens + `EASE_LUX` → one consistent motion language.

---

## 2. Buttons

- **Glow (`lux-action::before`):** retuned to a *very subtle* hover increase — opacity `0.9` → `0.7`, gradient softened (`0.25/0.18` → `0.22/0.16`), transition normalized to `var(--motion-normal)` / EASE_LUX. No scale introduced (MagneticButton already caps press scale at `0.94`, hover scale = `1`).
- **Light sweep:** already provided by `MagneticButton` (`group-hover` sheen, `via-white/25`, `ease-lux`). Left intact — satisfies the "tiny light sweep" requirement without new markup.
- **Hover polish:** shared `lux-hover` / `lux-action` now use `will-change: transform` for stable 60fps; elevation stays ≤ 2px (cards) — never exceeds the 1.01 scale ceiling conceptually (translateY only, no scale growth).

---

## 3. Payment Segment

- Selected-state transition rides the shared `lux-chip` transition: **280ms EASE_LUX** (within the 220–280ms spec band).
- On selection change, the previously-selected and newly-selected chips cross-fade their `bg` / `border` / `box-shadow` over 280ms EASE_LUX → a smooth **glide**, no snapping.
- Hover adds `translateY(-1px)` + `box-shadow 0 0 16px -8px rgba(71,194,255,0.22)` for tactile feedback.

---

## 4. Input (Investment amount)

Refined the focus micro-interaction (motion only — no typography change):

- Transition narrowed to `transition-[border-color,background-color,box-shadow] duration-[280ms] ease-lux` (was blanket `transition-all duration-300`) → smoother, GPU-friendly.
- Focus intensity increased: `border-accent/30` → `border-accent/40`, glass tint `bg-accent/[0.02]` → `bg-accent/[0.03]`.
- Added a soft focus glow: `focus-within:shadow-[0_0_22px_-8px_rgba(71,194,255,0.30)]`.
- **Placeholder fade:** `placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0` — the hint eases out on focus instead of硬-cut.

---

## 5. You Receive (AnimatedNumber)

- `AnimatedNumber` already tweens a `MotionValue` with **0.55s EASE_LUX** and renders plain text — no opacity, no scale, no flash. Confirmed compliant ("smooth easing, no flashing, no opacity popping"). Left as-is; it is the canonical value transition.

---

## 6. Progress Bar (InvestmentSummary)

- Width animates `whileInView` over **1.4s EASE_LUX** — smooth, monotonic, no elastic, no sudden jumps. Confirmed compliant. Left as-is.
- (Band entrance: 0.7s EASE_LUX — unchanged.)

---

## 7. Status Badges

- **Connected** dot (Wallet + wrong-network): opacity pulse `duration 2.4s`, now `ease: EASE_LUX` (was `easeInOut`) → softer, on-brand easing. No scaling.
- **Approving / tx status** dot: opacity pulse `duration 1.6s`, eased to `EASE_LUX` (was `easeInOut`). No scaling.
- **Live / Success / Approved** indicators rely on static labels + the above soft-fade dots — no scaling introduced.

---

## 8. Modals

- Backdrop fade: `duration 0.3s` → **0.25s (250ms)** EASE_LUX.
- Panel open/close: `initial/exit scale 0.94 → 1, y 20 → 0` refined to a tighter, calmer `scale 0.97 → 1, y 12 → 0`, `duration 0.25s` EASE_LUX.
- Backdrop `backdrop-blur-lg` interpolates via the opacity fade (Framer cannot tween `backdrop-filter` directly; the fade provides the blur-in/out perception). 250ms per spec.

---

## 9. Loading States

- **Spinner** (processing): `rotate 360` `duration 1.2s linear` infinite — kept `linear` (correct for continuous spin; must not be EASE_LUX or it would stutter). Continuous, no jank.
- **Button loading** (`MagneticButton`): inline `animate-spin` spinner overlay — unchanged.
- **Purchase / Approval** status row: uses the 1.6s EASE_LUX pulse dot above → continuous, calm.

---

## 10. Hover States — One Shared Language

All interactive surfaces now share the same timing + easing:

| Surface | Class | Behavior |
|---------|-------|----------|
| Cards / glass surfaces | `lux-hover` | `translateY(-2px)`, border + soft glow, 280ms EASE_LUX |
| Payment chips + quick-amount chips | `lux-chip` | `translateY(-1px)`, border `accent/0.30`, glass `accent/0.06`, faint accent glow, 280ms EASE_LUX |
| Primary action (Buy/Approve) | `lux-action` | subtle glow `0.7`, 280ms EASE_LUX + MagneticButton sheen |
| Input | focus-within | border `accent/0.40`, glass `accent/0.03`, soft glow, 280ms EASE_LUX |

---

## 11. Performance

- No new libraries, no new components, no new renders.
- `will-change: transform` added to `lux-hover` / `lux-chip` for compositor-only animation.
- Transitions scoped to specific properties (`transform`, `border-color`, `background-color`, `box-shadow`, `opacity`) → no layout thrash.
- Target: 60fps on all hover/focus/selection interactions.

---

## 12. Change Summary

| File | Change |
|------|--------|
| `app/globals.css` | Added `--motion-fast/normal/slow`; retuned `console-glass` hover (450ms), `lux-hover` (280ms + will-change), `lux-chip` (280ms, `translateY(-1px)`, glass glow, will-change), `lux-action::before` (subtler 0.7 glow, 280ms) |
| `components/presale/PresalePurchasePanel.tsx` | Connected/status dots `easeInOut`→`EASE_LUX`; modal backdrop `0.3s`→`0.25s`; modal panel tighter `scale 0.97 / y 12` @ `0.25s`; input container focus transition `280ms ease-lux` + glow + `border-accent/40` + `bg-accent/0.03`; input placeholder fade `focus:opacity-0` |
| `components/presale/InvestmentSummary.tsx` | (No change — progress bar already compliant: 1.4s EASE_LUX, smooth width, no elastic) |

**Zero layout changes. Zero JSX restructuring. Zero typography changes. Zero new components. Every animation improves usability.**
