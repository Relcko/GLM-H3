# RC19.1 — Dashboard Density Audit (Final UI Polish)

**Role:** Lead Product Designer + Senior Frontend Engineer
**Baseline:** RC19.0 (dashboard aligned to RC18 Presale language)
**Goal:** Remove ~20% visual noise, preserve 100% of information, keep layout locked.
**Build:** `npm run build` ✅ · **TypeScript:** `tsc --noEmit` ✅
**No changes to:** blockchain logic, wagmi, viem, hooks, APIs, calculations, routing, responsive breakpoints, layout architecture.

---

## Principle

For every section we asked: *"What is the single most important thing here?"* and then quieted everything else. No information was removed; only decoration, redundant glow, and oversized spacing were reduced. Hierarchy is preserved through **contrast + spacing** only (typography scale unchanged per spec).

---

## 1. Removed Visual Elements

### 1.1 Decorative hover gradient overlays (pure noise)
| Component | Removed | Why |
|-----------|---------|-----|
| `PortfolioKPI.tsx` — `KPIValue` | `<div className="…absolute -inset-x-4 -top-4 h-24 bg-gradient-to-b from-accent/[0.02]…opacity-0 group-hover:opacity-100" />` | A hover-only sheen that added no information; pure decoration. Removing it makes the KPI tiles read as one calm surface. |
| `RewardsCard.tsx` — Claim button | `<span className="…absolute inset-0 rounded-full from-transparent via-success/5… group-hover:opacity-100" />` | A hover-only success sweep on an already-colored button. Redundant with the button's own hover state. |

### 1.2 Excessive static glow
| Component | Before → After | Why |
|-----------|----------------|-----|
| `RewardsCard.tsx` — Claim button | `shadow 0 0 20px /0.12` + hover `0 0 30px /0.2` → `0 0 10px /0.08` + hover `0 0 16px /0.12` | The button already communicates state via color; the strong green halo was decorative intensity. Reduced to a faint presence. |
| `DashboardHero.tsx` — progress fill | `shadow 0 0 8px /0.3` → `0 0 4px /0.18` | Progress bar glow was the most "loud" element on the hero. Softened so the value, not the glow, leads. |
| `InvestorStats.tsx` — progress fill | `shadow 0 0 6px /0.2` → `0 0 4px /0.15` | Same calm-down as hero; consistent progress-bar treatment across the dashboard. |

### 1.3 Ambient gradient intensity
| Component | Before → After | Why |
|-----------|----------------|-----|
| `DashboardHero.tsx` — hero overlay | `from-accent/[0.03] … to-accent-blue/[0.02]` → `/[0.02] … /[0.01]` | Lowered the ambient tint so the glass surface itself carries the premium feel instead of a colored wash. |

---

## 2. Spacing Refinements (balance, not height change)

| Component | Change | Why |
|-----------|--------|-----|
| `RewardsCard.tsx` — card padding | `sm:px-8 sm:py-8` → `sm:px-7 sm:py-7` (both connected + disconnected) | The card felt over-padded relative to its content; tightening balances whitespace and keeps total page height ~identical. |
| `InvestorActivity.tsx` — inner padding | `sm:px-8 sm:py-6` → `sm:px-7 sm:py-6` | Aligns the activity card's interior rhythm with the rest of the dashboard. |
| `TransactionHistory.tsx` — row density | `py-3` → `py-2.5` on all four cells | Increases row density so more history is visible per scroll without changing the table's structure or function. |

Spacing was only *reduced* where it was oversized; cramped areas were not present after RC19.0, so no area was expanded. Net effect: quieter, denser, more institutional.

---

## 3. Icons

### 3.1 Standardized optical size
| Component | Change | Why |
|-----------|--------|-----|
| `InvestorActivity.tsx` — type icons | `14×14` → `16×16` (purchase / stake / claim) | Matches the `16×16` icons used in `PortfolioKPI`. All remaining functional icons now share one optical size, removing subtle size jitter between cards. |

### 3.2 Icons kept (value-bearing)
- `PortfolioKPI` 16×16 metric icons — differentiate Wallet/Staked/Stakes/Invested at a glance.
- `WalletHealth` 18×18 shield — single recognizability icon in a larger badge; appropriate scale.
- `RewardsCard` 24×24 empty-state illustration — communicates "no rewards" context.
- Transaction type pills and status dots — text/color already conveys state; icons omitted intentionally (no duplicate icon noise).

No icons were added. Only one size class was unified.

---

## 4. Tables — Transaction History

Improvements (functionality unchanged):
- **Row density:** `py-3 → py-2.5` for all cells.
- **Alignment:** columns retain `text-left` / `text-right` with consistent `pr-4` gutters; headers use `tracking-[0.2em] text-white/35` (from RC19.0).
- **Status readability:** status dot + label kept; dot color language (`success`/`warning`/muted) unchanged.
- **Hover clarity:** `hover:bg-white/[0.03]` + `transition-colors duration-[280ms] ease-lux` retained from RC19.0, now reads cleaner against the quieter surface.

---

## 5. Glass / Layering

- No nested glass cards were introduced. The `dashboard-glass` single-surface treatment (established in RC19.0) is preserved.
- The `PortfolioKPI` "Est. Value" pill remains a single `dashboard-glass` element inside a non-glass section (one surface, not stacked) — kept.
- Inner highlight panels (`WalletHealth` native-balance box `bg-white/[0.03]`) are flat tints, not bordered glass — they read as zones within one workspace, satisfying "one glass surface = one workspace."

---

## 6. Buttons

Verified, no redesign:
- `dashboard-btn` / `dashboard-btn-primary` — rounded-full, Presale hover glow, `:focus-visible` ring (from RC19.0) all intact.
- `RewardsCard` Claim button — only its decorative sweep and glow intensity were reduced (above); radius, padding, alignment, and focus behavior unchanged.
- `MagneticButton` (Connect Wallet) — untouched.

---

## 7. Accessibility & Performance

- Semantic HTML, keyboard nav, focus states, contrast, and screen-reader support preserved.
- No new libraries, no new dependencies, no extra renders, no component rewrites.
- Only class/attribute edits and the removal of two redundant decorative wrapper elements.

---

## 8. Quality Gate

- ✅ `npm run build` passes
- ✅ `tsc --noEmit` passes
- ✅ Zero blockchain changes
- ✅ Zero hook changes
- ✅ Zero API changes
- ✅ Zero routing changes
- ✅ Zero layout regressions
- ✅ Dashboard feels quieter / more premium than RC19.0 (less glow, fewer decorative gradients, denser table, balanced padding)

---

## 9. Files Touched

| File | Change |
|------|--------|
| `components/dashboard/PortfolioKPI.tsx` | Removed decorative hover gradient overlay div |
| `components/dashboard/RewardsCard.tsx` | Removed decorative claim-button sweep; reduced claim-button glow; tightened card padding |
| `components/dashboard/DashboardHero.tsx` | Softened progress-bar glow; softened ambient overlay |
| `components/dashboard/InvestorStats.tsx` | Softened progress-bar glow |
| `components/dashboard/InvestorActivity.tsx` | Standardized type-icon size 14→16; tightened inner padding |
| `components/dashboard/TransactionHistory.tsx` | Increased row density (`py-2.5`) |

**Net visual-noise reduction:** removed 2 decorative gradient overlays, reduced 3 glows, lowered 1 ambient wash, tightened 3 paddings, increased table density, unified icon size — with zero information loss and zero functional change.
