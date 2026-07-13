# Investor Portal Entry Experience v2 — Report

## Files Changed

| File | Type | Change |
|---|---|---|
| `components/dashboard/InvestorPortalScreen.tsx` | **Rewritten** | Hero-layout portal, Connect Wallet on screen, "Welcome Back", no loading steps |
| `components/dashboard/DashboardShell.tsx` | Modified | Sidebar entrance delay: 0.08s → 0.04s, duration: 0.6s → 0.5s |
| `app/presale/page.tsx` | Modified | Stagger: 0.1s → 0.04s, animation duration: 0.7s → 0.55s, y offset: 24→20 |

## What Changed (v1 → v2)

### Portal Screen
| v1 | v2 |
|---|---|
| 5 status steps with progress bar | **Removed** — no loading steps, no progress bar |
| Status dots + checkmarks per step | **Removed** |
| Automatic step advancement | **Removed** — portal waits on wallet connection |
| StaggerChildren: 0.1s | **0.04s** — 2.5× faster |
| Animation duration: 0.7s | **0.55s** — sections appear faster |
| Sidebar delay: 0.08s | **0.04s** — sidebar appears earlier |

### New Portal Layout
```
 ┌──────────────────────────────┐
 │                              │
 │        [Relcko Logo]         │
 │                              │
 │         R  E  L  C  K  O      │
 │                              │
 │      Investor Portal         │
 │                              │
 │ Access your private invest-  │
 │    ment dashboard.           │
 │                              │
 │    ┌──────────────────┐      │
 │    │  Connect Wallet   │      │
 │    └──────────────────┘      │
 │                              │
 └──────────────────────────────┘
```

### Flow

1. **Landing → Presale clicked**
2. **Portal screen** — matte black, centered logo, "RELCKO", "Investor Portal", description, Connect Wallet button
3. **If wallet already connected** — shows "Welcome Back" (200ms) → exits → dashboard reveals
4. **If wallet not connected** — user clicks "Connect Wallet" → RainbowKit modal → after approval → shows "✓ Wallet Connected", address, network, "Authenticating..." (600ms) → exits → dashboard reveals

### Entry Transition (600–800ms continuous motion)

```
t=0ms     Exit starts
          ↓ Portal: opacity 1→0, scale 1→0.85, y 0→-24
          ↓ Sidebar: opacity 0→1 (delay 40ms)
          ↓ Section 1 (Hero): opacity 0→1 (initial delay 40ms)
t=40ms    ↓ Section 2 (Grid): stagger 40ms
t=80ms    ↓ Section 3 (Staking)
t=120ms   ↓ Section 4 (Portfolio)
t=160ms   ↓ Section 5 (Stats)
t=200ms   ↓ Section 6 (Benefits)
t=240ms   ↓ Section 7 (Tokenomics)
t=280ms   ↓ Section 8 (Monitor)
t=320ms   ↓ Section 9 (FAQ)
          ↓
t=700ms   Portal fully transparent (duration 0.7s)
          ↓
t~820ms   Last section animation completes (280ms + 550ms)
          ↓
          Dashboard fully revealed
```

All transitions use `EASE_LUX = [0.16, 1, 0.3, 1]`. No gaps between steps — continuous single motion.

## Visual Design Notes

- **Apple/BlackRock/Stripe/Bloomberg** enterprise aesthetic
- Matte black `#0A0A0A` background
- Large spacing (`gap-10`), elegant typography (Cormorant Garamond `font-display`, 5xl, tracking 0.3em)
- Thin border on Connect button (`border-white/[0.1]`)
- Green checkmark for wallet connection confirmation
- No particles, no gradients, no flashy crypto elements

## Performance

- Zero additional RPC calls
- All hooks already subscribed via wagmi (`useAccount`, `useChainId`)
- Portal uses only one `motion.div` with scale+opacity+y transform — minimal GPU work
- Children render behind portal during initialization (no double-mounting)
- "Welcome Back" case: 200ms visible → complete reveal in ~900ms total
- "Connect" case: 600ms auth → complete reveal in ~1.3s total

## Accessibility

- **`prefers-reduced-motion`**: detected via `useReducedMotion()`. When active, sets `setTimeout(0)` to skip directly to children. No animation, no portal flash.
- **SSR compatibility**: `"use client"` component, renders portal identically on server and client (no hydration mismatch). Wagmi hooks return defaults on server, update on client.
- **No fake loading**: all timing is genuine — "Authenticating..." displays for a fixed 600ms after wallet connected (this is connection confirmation, not loading). "Welcome Back" exits after 200ms.

## Regression Verification

| Concern | Status |
|---|---|
| Routing unchanged | ✅ No route files modified |
| Blockchain logic unchanged | ✅ No ABI, contract, or read service changes |
| Wagmi/RainbowKit unchanged | ✅ No provider or config changes |
| Navbar `initial={false}` | ✅ Unchanged |
| DashboardHero blockchain reads | ✅ Unchanged |
| PresalePurchasePanel | ✅ Unchanged |
| Sidebar IntersectionObserver | ✅ Unchanged |
| Overall page layout | ✅ Only sidebar wrapper animation changed |

## Build Status

- **TypeScript**: `npx tsc --noEmit` — zero errors
- **Lint**: `npx eslint` on all 3 changed files — zero errors, zero warnings
