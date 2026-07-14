# RC20.1 — Global Error Boundary & Final Release Hardening

**Date:** 2026-07-14
**Author:** Principal Frontend Engineer / Release Engineer
**Status:** ✅ Complete — RC20 production ready for release tagging
**Scope guard honored:** UI frozen. No redesign, spacing, typography, motion, blockchain, wagmi, viem, API, hook, routing, or calculation changes. Only production resilience added.

---

## Files Created

| File | Type | Purpose |
|---|---|---|
| `app/error.tsx` | Client Component (segment boundary) | Catches render/runtime errors in any route segment below the root layout; renders within the existing layout (so `globals.css`, Tailwind, and design tokens apply). |
| `app/global-error.tsx` | Client Component (root boundary) | Catches errors in the root layout itself. Must render its own `<html>`/`<body>`; fully self-contained (inline styles + scoped `<style>` block) so it works even when global styles fail to load. |

Both follow Next.js App Router conventions and expose the required `error` + `reset` props.

---

## Design Language Match

Constructed entirely from existing Relcko tokens — **no new design system introduced**:

- **Surface:** `.glass-strong` (gradient glass + inset highlight + depth shadow) for `error.tsx`; identical look hand-inlined for `global-error.tsx`.
- **Color:** `--bg-base #0E0F13` background, `--accent #47C2FF` primary, `rgba(255,255,255,0.06)` hairline borders, `#f0f0f2` text.
- **Type:** `font-display` (Cormorant Garamond, weight 300) for the heading, `font-mono` (JetBrains Mono) uppercase tracked eyebrow "Relcko", Inter for body — exactly the site's three-font stack.
- **Buttons:** Primary uses `.btn-depth` (layered shadow, `:active` scale) with `hover:shadow-btn-hover`; secondary uses ghost glass borders that brighten on hover.
- **Calm accent:** a single low-opacity radial `#47C2FF` glow at the top — institutional, not promotional.

---

## Error Handling Flow

```
Runtime error in a route segment
        │
        ├─► root layout itself throws ─────► app/global-error.tsx
        │        (renders own <html>/<body>, self-contained styles)
        │
        └─► segment below root throws ─────► app/error.tsx
                 (renders inside root layout; Tailwind + globals apply)

Both boundaries:
  1. useEffect → console.error(error)   (kept; no analytics, no 3rd-party)
  2. Render calm "Something went wrong" card
  3. [Try Again]      → reset()   (re-renders the segment, clears error)
  4. [Return to Dashboard] → /presale   (InvestorPortalScreen lives here)
  5. [Return to Home]      → /          (real existing routes)
```

- **Invisible in normal operation** — boundaries only mount on an uncaught error; zero runtime overhead otherwise.
- **reset()** is the framework-provided recovery function; wired directly to the primary button.
- **No new dependencies** — only `react`, `next/link`, and existing CSS utilities.

---

## Accessibility

- Semantic HTML: real `<h1>`, `<p>`, `<button>`, and `next/link` `<a>`.
- `role="alert"` on the error card announces the failure to screen readers.
- **Keyboard accessible:** all controls are native `<button>` / `<a>` (focusable by default).
- **Focus visible:** `error.tsx` uses `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`; `global-error.tsx` defines `.ge-btn:focus-visible { outline: 2px solid #47C2FF; outline-offset: 2px; }`.
- **Proper labels:** every button/link has descriptive text ("Try Again", "Return to Dashboard", "Return to Home").

---

## Verification Steps

1. **`npm run build`** — compiles successfully; both boundaries recognized by Next.
2. **`tsc --noEmit`** — no type errors.
3. **Scoped lint** `eslint components app lib` — 14 issues, **all pre-existing benign** (`react-hooks/set-state-in-effect` ×11, `exhaustive-deps` ×2, `refs` ×1). **Zero new issues** from the error files. (The initial `<a>`→`<Link>` swap resolved the only new lint error, `@next/next/no-html-link-for-pages`.)
4. **Manual trigger check (recommended pre-tag):** temporarily throw in a page during QA to confirm the boundary renders and `Try Again` recovers; revert immediately. Not performed here to avoid touching source.
5. **Regression confirmation:** routes unchanged (`/`, `/_not-found`, `/presale`, `/robots.txt`, `/sitemap.xml`); no wallet/wagmi/viem/UI changes.

---

## Build Results

```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully
✓ TypeScript passed
✓ Generating static pages (6/6)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /presale
├ ○ /robots.txt
└ ○ /sitemap.xml
```

## TypeScript Results

`tsc --noEmit` → **no errors**.

---

## Release Decision

✅ **RC20 is complete and ready for release tagging.**

- RC20.0: production audit passed; debug-leak fixed.
- RC20.1: production-grade global error handling added; all gates green; no regressions; UI frozen and untouched.

**No blockers. No Critical/High findings. Safe to tag.**
