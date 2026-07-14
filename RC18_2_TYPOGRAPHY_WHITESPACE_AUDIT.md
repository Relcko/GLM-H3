# RC18.2 — Typography & Whitespace Audit

**Role:** Lead Product Designer, Relcko
**Scope:** `components/presale/InvestmentSummary.tsx` + `components/presale/PresalePurchasePanel.tsx` (connected-state block)
**Status:** RC18.1 complete → RC18.2 applied. Layout, grid, responsive behavior, and all logic (wagmi / viem / wallet / purchase / staking) untouched.
**Build:** `npm run build` ✅ · **TypeScript:** `tsc --noEmit` ✅
**Philosophy:** Increase institutional elegance, breathing room, and readability through typography and spacing only. No noticeable redesign.

---

## 1. Visual Hierarchy (target)

| Tier | Elements | Treatment |
|------|----------|-----------|
| **Largest (dominate)** | You Receive value, Investment amount input, Buy button | Display serif, `font-light`, full opacity, large scale |
| **Medium** | Current Price, Stage, Raised value, Progress | Mono figures, brighter than labels, `tabular-nums` |
| **Small (secondary)** | Wallet · Payment · Investment · Receive · Action labels, trust labels | `institutional-label` (0.35 opacity, uppercase, tracked), 0.46–0.52rem |

Rule enforced: **labels recede, values dominate.** No added visual noise.

---

## 2. Typography Refinements

### 2.1 `PresalePurchasePanel.tsx` — connected-state block
- **You Receive (primary value):** added `tracking-tight tabular-nums` so large numbers sit on a tight, aligned numeric baseline. (`font-display text-4xl … xl:text-[2.9rem]`)
- **Investment amount input:** added `tracking-tight tabular-nums` for numeric alignment; placeholder raised from `white/[0.15]` → `white/20` for a more legible but still quiet hint. (`pt-2.5 text-3xl … sm:text-4xl`)
- **Receive secondary figures (Estimated Value, Current Price):** brightened from `text-white/70` → `text-white/80` to push values forward against their muted labels.
- **Wallet detail values (Address / Network / Token / Balance `dd`):** brightened from `text-white/75` → `text-white/85` so wallet data reads as primary information, not chrome.
- **Action buttons (Buy / Approve):** added `tracking-wide` for calmer, more institutional letter-spacing on the primary CTA.
- **Payment segmented control:** token icons normalized from `15×15` → `16×16` to match the Investment input badge (16×16) for **equal optical icon size** across the console.

### 2.2 `InvestmentSummary.tsx` — information band
- **Cell label→value rhythm:** increased internal gap from `gap-1.5` → `gap-2`, giving labels more separation from their values (breathing room without increasing section height).
- **Values** already use `institutional-figure` (`tabular-nums`, `-0.02em` tracking) and `text-white/90` — confirmed dominant vs `institutional-label` (0.35 opacity). No change required.
- **Labels** (`Current Stage`, `Current Price`, `Raised`, `Progress`, `Next Stage`, `Remaining`) confirmed at 0.52–0.55rem uppercase tracked — correctly secondary.

---

## 3. Whitespace Audit

- **Connected-state grid** (`PresalePurchasePanel`): column rhythm preserved — `gap-y-8 gap-x-8` mobile/tablet, `xl:px-7` columns with vertical dividers on desktop. No height added; space redistributed only via inner gaps.
- **Wallet `dl`:** row gap opened `gap-y-2.5` → `gap-y-3` for calmer vertical rhythm between address / network / token / balance.
- **Receive block:** secondary rows kept at `space-y-1.5`; value block sits with `gap-3` from header — rhythm consistent with sibling columns.
- **Action block:** settlement copy spacing relaxed `mt-0.5` → `mt-1` and given `tracking-wide` for a quieter, more spaced caption.
- **InvestmentSummary band:** `Cell` internal gap `gap-1.5` → `gap-2` (see 2.2). Outer padding (`px-4 py-4 lg:py-5 lg:px-6 xl:px-7`) unchanged → **no page-height increase**.

---

## 4. Alignment Audit

- **Numeric alignment:** `tabular-nums` now applied to the two largest numbers (You Receive, Investment amount) so digits share a fixed advance width and align on a visual baseline as values change.
- **Icons:** payment-chip token icons equalized to 16×16 (matching the Investment badge) → consistent optical size and spacing (`gap-2`) between icon and symbol in both controls.
- **Columns:** all five columns share `flex flex-col` with header at top and `xl:px-7 xl:py-2`; `xl:divide-white/[0.06]` keeps consistent vertical separators. Header labels share one type token (`institutional-label text-[0.5rem]`).
- **Wallet labels:** standardized to `text-[0.46rem]` (matching Receive secondary labels) for uniform micro-label sizing.

---

## 5. Divider Audit

- **Console column divider:** softened `xl:divide-white/[0.08]` → `xl:divide-white/[0.06]` for a quieter hairline between columns.
- **InvestmentSummary band:** cell separators unified `bg-white/[0.05]` → `bg-white/[0.06]` so all hairlines across the presale surface share one opacity. Status-line border already `white/[0.06]` — now consistent.
- No borders added; no redundant separators introduced.

---

## 6. Button & Input Polish

- **Buy / Approve buttons:** added `tracking-wide` (letter-spacing) only. Padding, variant, glow (`lux-action`), focus, and hover behavior inherited and unchanged — no redesign.
- **Investment input:** numeric `tabular-nums` + `tracking-tight`, brighter placeholder (`white/20`); container padding, focus ring (`focus-within:border-accent/30`), and layout untouched.

---

## 7. Payment Control Polish

- Icon optical size equalized (16×16), spacing preserved (`gap-2`).
- Selected state, hover (`lux-chip`), `active:scale-[0.97]`, and `focus-visible:ring` (added in RC18.1) retained. Indicator timing consistent (`transition-all` via `lux-chip` 0.35s). No structural change.

---

## 8. Motion Audit (Framer Motion)

- **Connected-status pulse** (Wallet "Connected" dot): `duration: 2.4, repeat: Infinity, ease: "easeInOut"` — identical in both connected and wrong-network states. Consistent, kept.
- **You Receive value:** smooth `AnimatedNumber` tween (0.55s `EASE_LUX`) — replaced the old key-remount flash in RC18.1; retained.
- **Modal processing spinner:** `duration: 1.2` linear rotate — kept.
- **InvestmentSummary progress bar:** `duration: 1.4` `EASE_LUX` — kept.
- No decorative animations added; no inconsistent timings introduced. All easing routes through `EASE_LUX` or the existing `easeInOut`/`linear` presets.

---

## 9. Performance

- No new libraries, no new components, no component rewrites, no extra renders. Only Tailwind class and timing changes on existing elements.

---

## 10. Change Summary (files touched)

| File | Change |
|------|--------|
| `components/presale/PresalePurchasePanel.tsx` | You Receive `tracking-tight tabular-nums`; input `tracking-tight tabular-nums` + placeholder `white/20`; Receive figures `white/70→white/80`; Wallet `dd` `white/75→white/85`; payment icons `15→16`; Buy/Approve `tracking-wide`; divider `0.08→0.06`; Wallet `dl` `gap-y-2.5→3` |
| `components/presale/InvestmentSummary.tsx` | `Cell` `gap-1.5→gap-2`; band dividers `bg-white/[0.05]→[0.06]` |

**Zero layout changes. Zero JSX restructuring. Zero height increase.**
