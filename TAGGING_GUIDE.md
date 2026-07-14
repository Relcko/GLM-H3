# Tagging Guide — Relcko v1.0.0-rc20

**Purpose:** standardize how the `v1.0.0-rc20` release is tagged, committed, and published on GitHub.

---

## Recommended Git Tag

```
v1.0.0-rc20
```

Use an **annotated tag** (preferred for releases):

```bash
git tag -a v1.0.0-rc20 -m "Relcko v1.0.0-rc20 — Production Release Candidate"
git push origin v1.0.0-rc20
```

(If a lightweight tag is required: `git tag v1.0.0-rc20 && git push origin v1.0.0-rc20`.)

---

## Recommended Commit Message

```
chore(release): v1.0.0-rc20 — Production Readiness & Global Error Boundaries

- RC18/RC19 finalized (presale polish, dashboard alignment, density)
- RC20.0 production readiness audit; removed 18 stray debug console.* calls
- RC20.1 global error boundaries (app/error.tsx, app/global-error.tsx)
- UI/UX/blockchain/wagmi/viem/hooks/APIs/routing frozen and unchanged
- Build, tsc, and scoped lint gates green (14 benign warnings only)
```

---

## Recommended GitHub Release

**Title:**
```
Relcko v1.0.0-rc20
```

**Tag:** `v1.0.0-rc20`
**Target:** `main` (or the release branch)

**Release description (suggested):**

```md
## Relcko v1.0.0-rc20 — Production Release Candidate

Final engineering pass before public launch.

### Highlights
- Presale flow + Investor Portal dashboard finalized (RC18 / RC19).
- Production Readiness Audit complete (RC20.0): removed debug console leakage,
  verified SSR safety, secrets hygiene, reduced-motion, build artifacts.
- Global error handling added (RC20.1): `app/error.tsx` + `app/global-error.tsx`
  with on-brand dark glass UI and `reset()` recovery.

### Verification
- `npm run build` ✅
- `tsc --noEmit` ✅
- `eslint components app lib` → 14 benign warnings (non-blocking) ✅
- No `console.log`, no TODO/FIXME, no accidental test RPC URLs ✅

### Notes
- UI, typography, motion, blockchain, wagmi/viem, hooks, APIs, and routing are
  frozen and unchanged.
- bscTestnet is intentionally supported for the beta path.

See CHANGELOG.md, RELEASE_NOTES_v1.0.0-rc20.md, and PRODUCTION_CHECKLIST.md.
```

---

## Pre-Tag Checklist (run locally)

```bash
npm ci
npm run build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . (note: includes third-party bundle noise;
                       #           source-only check: npx eslint components app lib)
```

All gates must be green (warnings only, no errors) before tagging.
