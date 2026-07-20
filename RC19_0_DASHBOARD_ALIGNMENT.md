# RC19.0 — Premium Dashboard Alignment

**Role:** Lead Product Designer + Senior Frontend Engineer
**Source of truth:** RC18 Presale page (`console-glass`, `institutional-label`, `institutional-figure`, `lux-*`, accent `#47C2FF` / `#1E6BFF`, `EASE_LUX`, 180/280/450ms motion).
**Scope:** Investor Dashboard surface — `InvestorStats`, `PortfolioKPI`, `RewardsCard`, `WalletHealth`, `InvestorActivity`, `TransactionHistory`, `TransactionTimeline`, `DashboardHero` (+ shared `dashboard-*` tokens in `globals.css`).
**Status:** RC18 complete → RC19.0 applied. UI only.
**Build:** `npm run build` ✅ · **TypeScript:** `tsc --noEmit` ✅
**No changes to:** blockchain logic, wagmi, viem, staking, APIs, hooks, calculations, layout architecture, responsive breakpoints, routing, data loading, contract interaction.

---

## 1. Reused Design Tokens (from Presale / RC18)

All dashboard styling now routes through the same primitives as the Presale page.

### 1.1 Accent color unification (`globals.css`)
The dashboard previously used a distinct cyan `#00D4FF` / `rgba(0,212,255,…)` and blue `#0057FF` / `rgba(0,87,255,…)`. These were globally remapped to the Presale tokens:

| Old (dashboard) | New (Presale) |
|-----------------|---------------|
| `#00D4FF` | `#47C2FF` (`--accent`) |
| `rgba(0, 212, 255, …)` | `rgba(71, 194, 255, …)` |
| `#0057FF` | `#1E6BFF` (`--accent-blue`) |
| `rgba(0, 87, 255, …)` | `rgba(30, 107, 255, …)` |

Affected tokens: `.cyber-glow`, `.cyber-glow-strong`, `.text-cyber` gradient, `.dashboard-card::before`, `.dashboard-accent-line`, `.dashboard-gradient-card`, `.dashboard-btn-primary`, `.dashboard-input:focus`, `.spotlight::after`, plus inline shadows in `PortfolioKPI` / `DashboardHero` / `InvestorStats` progress bars.

### 1.2 Motion tokens (`globals.css` `:root`)
Reused the RC18 shared timing system:
- `--motion-fast: 180ms`
- `--motion-normal: 280ms`
- `--motion-slow: 450ms`
- `--ease-lux: cubic-bezier(0.16, 1, 0.3, 1)` (unchanged, already shared)

All dashboard transitions now use `var(--ease-lux)` + these durations (no bounce, no elastic).

### 1.3 Glass language
`.dashboard-glass` retuned to match `.console-glass` exactly:
- gradient `180deg rgba(255,255,255,0.035) → 0.014` (was `135deg 0.04 → 0.015`)
- `backdrop-filter: blur(40px) saturate(160%)`
- `border: 1px solid rgba(255,255,255,0.08)` (was `0.05`)
- `border-radius: 1.5rem` (**new** — matches Presale 24px corners)
- box-shadow `inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 80px -32px rgba(0,0,0,0.7)`
- hover: `border 0.12`, deeper shadow; transition `var(--motion-slow)`

### 1.4 Label language
`.dashboard-label` aligned to `.institutional-label`:
- `letter-spacing: 0.2em` (was `0.15em`)
- `color: rgba(255,255,255,0.35)` (was `0.3`)
- font-mono uppercase (unchanged)

### 1.5 Card language
`.dashboard-card` aligned to the RC18 `lux-hover` language:
- `border-radius: 1.125rem` (was `1rem`)
- hover: `translateY(-2px)`, `border-color rgba(71,194,255,0.28)`, soft accent glow — exact lux-hover treatment
- `will-change: transform`; transitions `var(--motion-normal)`

### 1.6 Button language
`.dashboard-btn` / `.dashboard-btn-primary` aligned to the Presale button language:
- `border-radius: 9999px` (rounded-full, was `0.75rem`)
- padding `0.625rem 1.5rem`, `letter-spacing: 0.02em`
- hover: `bg rgba(71,194,255,0.16)`, `border 0.40`, `box-shadow 0 0 20px rgba(71,194,255,0.15)`
- added `:focus-visible` ring (2px accent + offset) for keyboard parity
- transitions `var(--motion-normal)`

### 1.7 Input language
`.dashboard-input` aligned to the RC18 input focus:
- `border-radius: 1.125rem`
- focus: `border rgba(71,194,255,0.40)`, `bg accent/0.03`, `box-shadow 0 0 22px -8px rgba(71,194,255,0.30)`
- transitions `var(--motion-normal)`

### 1.8 Status badges
`.status-dot` keyframe retuned to **opacity-only** pulse (removed `transform: scale(1.1)`) — matches RC18 "no scaling" badge rule. Easing set to `EASE_LUX`.

### 1.9 Dividers / numbers
- `.dashboard-number` already `tabular-nums` `-0.02em` — matches `.institutional-figure`.
- `.dashboard-divider` gradient kept (already subtle, consistent with `console-divider`).

---

## 2. Component-Level Alignment

### 2.1 InvestorStats (`InvestorStats.tsx`)
- "Live" badge pulse dot: `ease: "easeInOut"` → `EASE_LUX`.
- Progress bar fill glow: `rgba(0,212,255,0.2)` → `rgba(71,194,255,0.2)`.
- Container now uses `dashboard-glass` (radius 24px from CSS; removed inline `rounded-xl` override).
- Typography hierarchy intact: `dashboard-label` (quiet) → `dashboard-number` values (strong, tabular).

### 2.2 PortfolioKPI (`PortfolioKPI.tsx`)
- Accent icon-chip glow: `rgba(0,212,255,0.08)` → `rgba(71,194,255,0.08)`.
- Uses `dashboard-card` (now 18px radius, lux-hover) + `dashboard-label` + `dashboard-number` + `text-cyber` (now Presale gradient).

### 2.3 RewardsCard (`RewardsCard.tsx`)
- Claim button: `rounded-xl` → `rounded-full`, `duration-300` → `duration-[280ms] ease-lux` (Presale button language).
- Inner sweep overlay: `duration-500` → `duration-[450ms] ease-lux`.
- Value uses `font-display text-3xl/4xl font-light` + `dashboard-number` (strong, tabular) — matches Largest tier.

### 2.4 WalletHealth (`WalletHealth.tsx`)
- Containers: `dashboard-glass rounded-xl` → `dashboard-glass` (24px radius).
- `HealthRow` + balance box: `rounded-xl` → `rounded-2xl`, `duration-300` → `duration-[280ms] ease-lux`.
- Token icon badge: `rounded-xl` → `rounded-full` (matches Presale token badge).
- Connect button: `rounded-xl` → `rounded-full`, timing → `280ms ease-lux`.
- Uses `status-dot` (now opacity-only) for the "Connected" pill.

### 2.5 InvestorActivity (`InvestorActivity.tsx`)
- Container: `dashboard-glass rounded-2xl` → `dashboard-glass` (24px radius).
- Live dot: `easeInOut` → `EASE_LUX`.
- Activity rows: `rounded-xl` → `rounded-2xl`, `duration-300` → `duration-[280ms] ease-lux`.
- Type icon badge: `rounded-lg` → `rounded-full`.
- Uses `dashboard-label` / `dashboard-accent-line`.

### 2.6 TransactionHistory (`TransactionHistory.tsx`) — Table
- Container (connected + disconnected): `rounded-2xl border bg backdrop-blur-sm` → **`dashboard-glass`** (one connected workspace surface).
- Header cells: `tracking-[0.15em] text-white/30` → `tracking-[0.2em] text-white/35` (matches institutional-label).
- Rows: added `hover:bg-white/[0.03]` + `transition-colors duration-[280ms] ease-lux`; separator `border-white/[0.03]` → `0.04`.
- "Explorer" link: `transition-colors` → `transition-colors duration-[280ms] ease-lux`.
- Status dots use the same `bg-success/bg-warning` language as Presale badges.
- Timestamps: `text-white/35` + `tabular-nums`.

### 2.7 TransactionTimeline (`TransactionTimeline.tsx`)
- Containers: `dashboard-glass rounded-2xl` → `dashboard-glass` (3 instances).
- `TimelineDot`: `transition-all duration-300` → `duration-[280ms] ease-lux`.
- "Explorer" link + hash link: timing → `duration-[280ms] ease-lux`.
- Type pill + status use Presale color language (`text-success` / `text-warning`).

### 2.8 DashboardHero (`DashboardHero.tsx`)
- Outer hero: `rounded-2xl border bg-gradient backdrop-blur` → **`dashboard-glass`** (shares the exact Presale glass surface); inner accent overlay retained.
- Progress bar fill glow: `rgba(0,212,255,0.3)` → `rgba(71,194,255,0.3)`.
- Status text: `tracking-[0.15em]` → `tracking-[0.2em]`.
- `MetricTile` uses `dashboard-glass` + `dashboard-label` + `text-cyber` (now Presale gradient).

### 2.9 StickyBuyConsole (`StickyBuyConsole.tsx`)
- Wraps `PresalePurchasePanel` directly → already 100% RC18-aligned by definition.

---

## 3. Hierarchy (per RC18 spec)

| Tier | Treatment | Where |
|------|-----------|-------|
| Largest | `font-display` light, `text-cyber`/white, `dashboard-number` tabular | Portfolio Value, Rewards, Investment (`RewardsCard`, `PortfolioKPI`, `InvestorStats`) |
| Medium | `dashboard-number` mono tabular, `text-white/80–90` | KPIs, Returns, Statistics (`KPIValue`, `MetricTile`, `StatRow`) |
| Small | `dashboard-label` (0.2em, 0.35 opacity, uppercase mono) | All labels, descriptions, metadata |

Labels recede, values dominate — identical to the Presale page.

---

## 4. Charts / Tables / Responsive

- No charts in the investor dashboard.
- Table (Transaction History): improved row spacing, hover, header alignment, numeric/tabular columns, status badges — functionality preserved.
- Responsive breakpoints and layout architecture unchanged; only spacing/presentation refined.

---

## 5. Accessibility / Performance

- Semantic HTML, keyboard support, and focus visibility preserved (added `:focus-visible` ring to `.dashboard-btn`).
- No new libraries, no component rewrites, no extra renders. All motion uses compositor-friendly `transform`/`opacity`/`border-color`/`background-color`/`box-shadow`.
- Shared CSS tokens mean one change propagates across every dashboard surface — no per-component drift.

---

## 6. Quality Gate

- ✅ Build passes (`npm run build`)
- ✅ TypeScript passes (`tsc --noEmit`)
- ✅ No blockchain logic changed
- ✅ No hooks changed
- ✅ No API changes
- ✅ No layout regressions
- ✅ Dashboard visually matches the Presale page (shared glass, accent, labels, motion)

---

## 7. Files Touched

| File | Change type |
|------|-------------|
| `app/globals.css` | Token retune: accent colors, motion tokens, glass, label, card, button, input, status-dot |
| `components/dashboard/InvestorStats.tsx` | easing, progress glow, glass radius |
| `components/dashboard/PortfolioKPI.tsx` | accent glow color |
| `components/dashboard/RewardsCard.tsx` | button radius + timing, sweep timing |
| `components/dashboard/WalletHealth.tsx` | glass radius, row/icon radius, timing |
| `components/dashboard/InvestorActivity.tsx` | glass radius, easing, row/icon radius, timing |
| `components/dashboard/TransactionHistory.tsx` | glass surface, header labels, row hover, timing |
| `components/dashboard/TransactionTimeline.tsx` | glass radius, dot/link timing |
| `components/dashboard/DashboardHero.tsx` | glass surface, progress glow, status tracking |

**Zero business logic, zero blockchain, zero hook, zero API, zero layout changes.**
